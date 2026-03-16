// ============================================================
// src/services/checkinService.ts
// Use Case: NHẬN PHÒNG (CHECK-IN)
//
// Luồng xử lý:
//   1. Tìm PhieuDatPhong theo maDatPhong
//   2. Validate: phiếu phải ở trạng thái "DaXacNhan" hoặc "ChoDuyet"
//   3. Validate: ngàyDen không được quá sớm / quá trễ (tùy chính sách)
//   4. Transaction:
//      a. Cập nhật PhieuDatPhong.trangThai → "DaCheckIn"
//      b. Cập nhật Phong.tinhTrang → "DangSuDung"
// ============================================================

import prisma from "../lib/db";
import { AppError } from "../middleware/errorHandler";

async function timPhieuTheoBookingRef(bookingRef: string) {
  return prisma.phieuDatPhong.findFirst({
    where: {
      OR: [{ maDatPhong: bookingRef }, { id: bookingRef }],
    },
    include: {
      phong: { select: { soPhong: true, tinhTrang: true, idLoaiPhong: true } },
      khachHang: { select: { hoTen: true, sdt: true } },
    },
  });
}

function validateTrangThaiCheckIn(trangThai: string) {
  if (["DaCheckIn", "DaCheckOut", "DaHuy"].includes(trangThai)) {
    throw new AppError(
      400,
      "Đơn đặt phòng này đã được xử lý hoặc không hợp lệ",
    );
  }

  const trangThaiHopLe: string[] = ["ChoDuyet", "DaXacNhan"];
  if (!trangThaiHopLe.includes(trangThai)) {
    throw new AppError(
      400,
      `Không thể check-in. Phiếu đang ở trạng thái: "${trangThai}". ` +
        `Cần ở trạng thái "ChoDuyet" hoặc "DaXacNhan".`,
    );
  }
}

async function thucHienCheckInTheoBookingRef(bookingRef: string) {
  // ── Bước 1: Tìm phiếu kèm thông tin phòng ────────────────
  const phieu = await timPhieuTheoBookingRef(bookingRef);

  if (!phieu) {
    throw new AppError(404, `Không tìm thấy booking: ${bookingRef}`);
  }

  // ── Bước 2: Validate trạng thái phiếu ────────────────────
  validateTrangThaiCheckIn(phieu.trangThai);

  // ── Bước 3: Validate trạng thái phòng ────────────────────
  // Phòng phải là "DaDuocDat" (được set khi tạo phiếu)
  if (phieu.phong.tinhTrang !== "DaDuocDat") {
    throw new AppError(
      409,
      `Phòng ${phieu.soPhong} không ở trạng thái sẵn sàng nhận phòng ` +
        `(trạng thái hiện tại: ${phieu.phong.tinhTrang}).`,
    );
  }

  // ── Bước 4: Validate ngày check-in ───────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ngayDen = new Date(phieu.ngayDen);
  ngayDen.setHours(0, 0, 0, 0);

  // Cho phép check-in sớm tối đa 1 ngày hoặc quá hạn tối đa 1 ngày
  const diffMs = today.getTime() - ngayDen.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < -1) {
    throw new AppError(
      400,
      `Chưa đến ngày nhận phòng. Ngày đến theo lịch: ${phieu.ngayDen.toLocaleDateString("vi-VN")}.`,
    );
  }
  if (diffDays > 1) {
    throw new AppError(
      400,
      `Phiếu đặt phòng đã quá hạn nhận phòng. Vui lòng liên hệ quầy lễ tân.`,
    );
  }

  // ── Bước 5: Transaction ───────────────────────────────────
  const [phieuCapNhat] = await prisma.$transaction([
    prisma.phieuDatPhong.update({
      where: { maDatPhong: phieu.maDatPhong },
      data: { trangThai: "DaCheckIn" },
      include: {
        khachHang: { select: { hoTen: true, sdt: true, email: true } },
        phong: {
          select: {
            soPhong: true,
            giaPhong: true,
            loaiPhong: {
              select: {
                tenLoai: true,
              },
            },
          },
        },
      },
    }),
    prisma.phong.update({
      where: { soPhong: phieu.soPhong },
      data: { tinhTrang: "DangSuDung" },
    }),
  ]);

  return {
    success: true,
    message: `Check-in thành công! Chào mừng ${phieu.khachHang.hoTen} đến phòng ${phieu.soPhong}.`,
    data: phieuCapNhat,
  };
}

export async function thucHienCheckIn(maDatPhong: string) {
  return thucHienCheckInTheoBookingRef(maDatPhong);
}

export async function thucHienCheckInTheoBookingId(bookingId: string) {
  return thucHienCheckInTheoBookingRef(bookingId);
}
