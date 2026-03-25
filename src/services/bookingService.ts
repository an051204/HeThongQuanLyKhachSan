// ============================================================
// src/services/bookingService.ts
// Use Case: ĐẶT PHÒNG TRỰC TUYẾN
//
// Luồng xử lý:
//   1. Validate input (ngàyDen < ngàyDi, v.v.)
//   2. Kiểm tra phòng tồn tại và đang ở trạng thái "Trong"
//   3. Dùng Prisma Transaction để đảm bảo tính atomic:
//      a. Tạo PhieuDatPhong mới (trangThai = ChoDuyet)
//      b. Cập nhật tinhTrang phòng → "DaDuocDat"
//   → Nếu bất kỳ bước nào lỗi, toàn bộ rollback tự động.
// ============================================================

import { Decimal } from "@prisma/client/runtime/library";
import { Prisma } from "@prisma/client";
import prisma from "../lib/db";
import { AppError } from "../middleware/errorHandler";

export interface TaoDatPhongInput {
  idKhachHang: string;
  soPhong: string;
  ngayDen: string; // ISO 8601: "2026-04-01"
  ngayDi: string; // ISO 8601: "2026-04-05"
  tienCoc: number;
}

export interface DanhSachDatPhongQueryInput {
  trangThai?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

function parsePageValue(value: number | undefined, fallback: number) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value <= 0) return fallback;
  return value;
}

function coBoLocPhanTrang(input: DanhSachDatPhongQueryInput) {
  return (
    input.page !== undefined ||
    input.pageSize !== undefined ||
    Boolean(input.search?.trim())
  );
}

export async function taoDatPhong(input: TaoDatPhongInput) {
  const { idKhachHang, soPhong, ngayDen, ngayDi, tienCoc } = input;

  // ── Bước 1: Validate ngày ─────────────────────────────────
  const dateNgayDen = new Date(ngayDen);
  const dateNgayDi = new Date(ngayDi);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const normalizedNgayDen = new Date(dateNgayDen);
  normalizedNgayDen.setHours(0, 0, 0, 0);

  if (isNaN(dateNgayDen.getTime()) || isNaN(dateNgayDi.getTime())) {
    throw new AppError(400, "Ngày đến hoặc ngày đi không hợp lệ.");
  }
  if (normalizedNgayDen < today) {
    throw new AppError(400, "Ngày đến không được ở trong quá khứ.");
  }
  if (dateNgayDi <= dateNgayDen) {
    throw new AppError(400, "Ngày đi phải sau ngày đến.");
  }
  if (tienCoc < 0) {
    throw new AppError(400, "Tiền cọc không hợp lệ.");
  }

  // ── Bước 2: Kiểm tra khách hàng tồn tại ──────────────────
  const khachHang = await prisma.khachHang.findUnique({
    where: { idKhachHang },
    select: { idKhachHang: true, hoTen: true, sdt: true, email: true },
  });
  if (!khachHang) {
    throw new AppError(404, `Không tìm thấy khách hàng với ID: ${idKhachHang}`);
  }

  // ── Bước 3: Kiểm tra phòng tồn tại và còn trống ──────────
  const phong = await prisma.phong.findUnique({
    where: { soPhong },
    select: {
      soPhong: true,
      idLoaiPhong: true,
      giaPhong: true,
      tinhTrang: true,
    },
  });
  if (!phong) {
    throw new AppError(404, `Không tìm thấy phòng số: ${soPhong}`);
  }
  if (phong.tinhTrang !== "Trong") {
    throw new AppError(
      409,
      `Phòng ${soPhong} hiện không còn trống (trạng thái: ${phong.tinhTrang}).`,
    );
  }

  const nhanVienHeThong = await prisma.nhanVien.findFirst({
    where: {
      isActive: true,
      vaiTro: {
        in: ["QuanLy", "KeToan", "LeTan"],
      },
    },
    select: { idNhanVien: true },
  });

  if (!nhanVienHeThong) {
    throw new AppError(
      500,
      "Không tìm thấy nhân viên nội bộ để khởi tạo hóa đơn đặt cọc.",
    );
  }

  // ── Bước 4: Transaction — tạo phiếu & cập nhật phòng ─────
  // Prisma $transaction đảm bảo 2 thao tác thành công hoặc rollback cùng nhau
  const phieuDatPhong = await prisma.$transaction(async (tx) => {
    const phieuMoi = await tx.phieuDatPhong.create({
      data: {
        userId: null,
        guestName: khachHang.hoTen,
        guestPhone: khachHang.sdt,
        guestEmail: khachHang.email,
        idKhachHang,
        soPhong,
        ngayDen: dateNgayDen,
        ngayDi: dateNgayDi,
        tienCoc: new Decimal(tienCoc),
        trangThai: "ChoDuyet",
      },
      select: { maDatPhong: true },
    });

    await tx.phong.update({
      where: { soPhong },
      data: { tinhTrang: "DaDuocDat" },
    });

    await tx.hoaDon.create({
      data: {
        maDatPhong: phieuMoi.maDatPhong,
        idNhanVien: nhanVienHeThong.idNhanVien,
        tienPhong: new Decimal(0),
        tienDichVu: new Decimal(0),
        phuPhi: new Decimal(0),
        tongTien: new Decimal(tienCoc),
        trangThai: "ChuaThanhToan",
        ghiChu:
          "Hóa đơn đặt cọc trực tuyến. Số tiền còn lại sẽ được cập nhật khi check-out.",
      },
    });

    return tx.phieuDatPhong.findUniqueOrThrow({
      where: { maDatPhong: phieuMoi.maDatPhong },
      include: {
        khachHang: { select: { hoTen: true, email: true, sdt: true } },
        phong: { select: { loaiPhong: true, giaPhong: true } },
        hoaDon: true,
      },
    });
  });

  // Gửi email xác nhận đặt phòng
  try {
    const { hoTen, email } = phieuDatPhong.khachHang;
    const roomDetail = `${phieuDatPhong.phong.loaiPhong.tenLoai} - ${phieuDatPhong.soPhong}`;
    const data = {
      customerName: hoTen,
      bookingCode: phieuDatPhong.maDatPhong,
      roomDetail,
      checkinDate: phieuDatPhong.ngayDen.toLocaleDateString("vi-VN"),
      checkoutDate: phieuDatPhong.ngayDi.toLocaleDateString("vi-VN"),
      // Đã sửa lỗi TypeScript ở đây: Ép kiểu về Number trước khi toLocaleString
      totalAmount: phieuDatPhong.hoaDon?.tongTien
        ? Number(phieuDatPhong.hoaDon.tongTien).toLocaleString("vi-VN")
        : "0",
    };
    const { EmailService } = await import("./emailService");
    await EmailService.sendBookingConfirmation(email, data);
  } catch (err) {
    console.error("[bookingService] Lỗi gửi email xác nhận đặt phòng:", err);
  }

  return {
    success: true,
    message:
      "Đặt phòng thành công. Vui lòng thanh toán tiền cọc theo hướng dẫn tại trang thanh toán.",
    data: phieuDatPhong,
  };
}

// ── Lấy danh sách đặt phòng (phục vụ quản lý) ────────────────
export async function danhSachDatPhong(input: DanhSachDatPhongQueryInput = {}) {
  const search = input.search?.trim();
  const where: Prisma.PhieuDatPhongWhereInput = {
    ...(input.trangThai && {
      trangThai: input.trangThai as import("@prisma/client").TrangThaiDat,
    }),
    ...(search && {
      OR: [
        { maDatPhong: { contains: search, mode: "insensitive" } },
        { soPhong: { contains: search, mode: "insensitive" } },
        {
          khachHang: {
            OR: [
              { hoTen: { contains: search, mode: "insensitive" } },
              { sdt: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ],
    }),
  };

  if (!coBoLocPhanTrang(input)) {
    const danhSach = await prisma.phieuDatPhong.findMany({
      where,
      include: {
        khachHang: { select: { hoTen: true, sdt: true, email: true } },
        phong: { select: { loaiPhong: true, giaPhong: true } },
      },
      orderBy: { thoiGianDat: "desc" },
    });

    return { success: true, data: danhSach };
  }

  const page = parsePageValue(input.page, 1);
  const pageSize = Math.min(parsePageValue(input.pageSize, 10), 50);
  const skip = (page - 1) * pageSize;

  const [items, totalItems] = await Promise.all([
    prisma.phieuDatPhong.findMany({
      where,
      include: {
        khachHang: { select: { hoTen: true, sdt: true, email: true } },
        phong: { select: { loaiPhong: true, giaPhong: true } },
      },
      orderBy: { thoiGianDat: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.phieuDatPhong.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    success: true,
    data: {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    },
  };
}

// ── Lấy chi tiết một phiếu đặt phòng ─────────────────────────
export async function chiTietDatPhong(maDatPhong: string) {
  const phieu = await prisma.phieuDatPhong.findUnique({
    where: { maDatPhong },
    include: {
      khachHang: true,
      phong: {
        include: {
          loaiPhong: {
            select: {
              tenLoai: true,
            },
          },
        },
      },
      hoaDon: true,
    },
  });

  if (!phieu) {
    throw new AppError(404, `Không tìm thấy phiếu đặt phòng: ${maDatPhong}`);
  }

  return { success: true, data: phieu };
}

// ── Lấy chi tiết booking theo booking id hoặc maDatPhong ─────
export async function chiTietDatPhongTheoBookingRef(bookingRef: string) {
  const phieu = await prisma.phieuDatPhong.findFirst({
    where: {
      OR: [{ maDatPhong: bookingRef }, { id: bookingRef }],
    },
    include: {
      khachHang: true,
      phong: {
        include: {
          loaiPhong: {
            select: {
              tenLoai: true,
            },
          },
        },
      },
      hoaDon: true,
    },
  });

  if (!phieu) {
    throw new AppError(404, `Không tìm thấy booking: ${bookingRef}`);
  }

  return { success: true, data: phieu };
}

// ── Danh sách booking của tài khoản khách hàng hiện tại ─────
export async function danhSachDatPhongCuaToi(userId: string) {
  const items = await prisma.phieuDatPhong.findMany({
    where: { userId },
    include: {
      khachHang: {
        select: {
          hoTen: true,
          sdt: true,
          email: true,
        },
      },
      phong: {
        include: {
          loaiPhong: {
            select: {
              tenLoai: true,
            },
          },
        },
      },
      hoaDon: true,
    },
    orderBy: [{ thoiGianDat: "desc" }],
  });

  return {
    success: true,
    data: items,
  };
}

// ── Lịch sử check-in/check-out 30 ngày gần nhất ─────────────
export async function lichSuCheckInCheckOut30Ngay() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const bookings = await prisma.phieuDatPhong.findMany({
    where: {
      trangThai: {
        in: ["DaCheckIn", "DaCheckOut"],
      },
      updatedAt: {
        gte: thirtyDaysAgo,
        lte: now,
      },
    },
    include: {
      khachHang: {
        select: {
          hoTen: true,
        },
      },
      phong: {
        include: {
          loaiPhong: {
            select: {
              tenLoai: true,
            },
          },
        },
      },
      hoaDon: {
        select: {
          maHoaDon: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const data = bookings.map((booking) => {
    const action =
      booking.trangThai === "DaCheckOut" ? "CHECK_OUT" : "CHECK_IN";
    const actionAt =
      booking.trangThai === "DaCheckOut"
        ? (booking.actualCheckOutDate ?? booking.updatedAt)
        : booking.updatedAt;

    return {
      bookingId: booking.id ?? booking.maDatPhong,
      maDatPhong: booking.maDatPhong,
      maHoaDon: booking.hoaDon?.maHoaDon || null,
      soPhong: booking.soPhong,
      tenLoaiPhong: booking.phong.loaiPhong?.tenLoai ?? null,
      tenKhachHang: booking.khachHang.hoTen,
      trangThai: booking.trangThai,
      action,
      actionAt,
    };
  });

  return { success: true, data };
}

// ── Hủy phiếu đặt phòng ──────────────────────────────────────
export async function huyDatPhong(maDatPhong: string) {
  const phieu = await prisma.phieuDatPhong.findUnique({
    where: { maDatPhong },
    select: { trangThai: true, soPhong: true },
  });

  if (!phieu) {
    throw new AppError(404, `Không tìm thấy phiếu đặt phòng: ${maDatPhong}`);
  }
  if (phieu.trangThai === "DaCheckIn" || phieu.trangThai === "DaCheckOut") {
    throw new AppError(
      400,
      `Không thể hủy phiếu đang ở trạng thái: ${phieu.trangThai}`,
    );
  }
  if (phieu.trangThai === "DaHuy") {
    throw new AppError(400, "Phiếu đặt phòng này đã được hủy trước đó.");
  }

  await prisma.$transaction([
    prisma.phieuDatPhong.update({
      where: { maDatPhong },
      data: { trangThai: "DaHuy" },
    }),
    prisma.phong.update({
      where: { soPhong: phieu.soPhong },
      data: { tinhTrang: "Trong" },
    }),
  ]);

  return { success: true, message: "Đã hủy phiếu đặt phòng thành công." };
}

// ── Xác nhận phiếu đặt phòng (ChoDuyet → DaXacNhan) ─────────
export async function xacNhanDatPhong(maDatPhong: string, idNhanVien: string) {
  const phieu = await prisma.phieuDatPhong.findUnique({
    where: { maDatPhong },
    include: {
      phong: { select: { giaPhong: true } },
      hoaDon: { select: { maHoaDon: true } },
    },
  });

  if (!phieu) {
    throw new AppError(404, `Không tìm thấy phiếu đặt phòng: ${maDatPhong}`);
  }
  if (phieu.trangThai !== "ChoDuyet") {
    throw new AppError(
      400,
      `Chỉ có thể xác nhận phiếu ở trạng thái "Chờ duyệt" (hiện: ${phieu.trangThai}).`,
    );
  }

  const nhanVien = await prisma.nhanVien.findUnique({
    where: { idNhanVien },
    select: { idNhanVien: true },
  });

  if (!nhanVien) {
    throw new AppError(404, `Không tìm thấy nhân viên với ID: ${idNhanVien}`);
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const soDemLuuTru = Math.max(
    1,
    Math.ceil(
      (new Date(phieu.ngayDi).getTime() - new Date(phieu.ngayDen).getTime()) /
        msPerDay,
    ),
  );
  const tienPhongTamTinh =
    parseFloat(phieu.phong.giaPhong.toString()) * soDemLuuTru;
  const tongTienTamTinh = Math.max(
    0,
    tienPhongTamTinh - parseFloat(phieu.tienCoc.toString()),
  );

  const updated = await prisma.$transaction(async (tx) => {
    const bookingUpdated = await tx.phieuDatPhong.update({
      where: { maDatPhong },
      data: { trangThai: "DaXacNhan" },
      include: {
        khachHang: { select: { hoTen: true, email: true, sdt: true } },
        phong: { select: { loaiPhong: true, giaPhong: true } },
        hoaDon: true,
      },
    });

    if (!phieu.hoaDon) {
      await tx.hoaDon.create({
        data: {
          maDatPhong,
          idNhanVien,
          tienPhong: new Decimal(tienPhongTamTinh),
          tienDichVu: new Decimal(0),
          phuPhi: new Decimal(0),
          tongTien: new Decimal(tongTienTamTinh),
          trangThai: "ChuaThanhToan",
          ghiChu:
            "Hóa đơn tạm tính được tạo khi xác nhận đặt phòng. Số tiền sẽ được cập nhật khi check-out.",
        },
      });
    }

    return bookingUpdated;
  });

  return {
    success: true,
    message: phieu.hoaDon
      ? "Đã xác nhận đặt phòng. Hóa đơn hiện có sẽ được cập nhật khi check-out."
      : "Đã xác nhận đặt phòng và tạo hóa đơn tạm tính.",
    data: updated,
  };
}
