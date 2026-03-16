// ============================================================
// src/services/dichVuService.ts
// CRUD dịch vụ khách sạn (minibar, giặt, spa...)
// ============================================================

import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../lib/db";
import { AppError } from "../middleware/errorHandler";

export interface TaoDichVuInput {
  tenDichVu: string;
  donGia: number;
  donVi: string; // "lan", "dem", "nguoi", "kg"
  moTa?: string;
}

export interface CapNhatDichVuInput {
  tenDichVu?: string;
  donGia?: number;
  donVi?: string;
  moTa?: string;
  isActive?: boolean;
}

export interface ThemDichVuVaoPhieuInput {
  maDatPhong: string;
  idDichVu: string;
  soLuong: number;
}

// ── Danh sách dịch vụ ────────────────────────────────────────
export async function layDanhSachDichVu(chiLayActive = true) {
  const list = await prisma.dichVu.findMany({
    where: chiLayActive ? { isActive: true } : undefined,
    orderBy: { tenDichVu: "asc" },
  });
  return { success: true, data: list };
}

// ── Tạo dịch vụ ──────────────────────────────────────────────
export async function taoDichVu(input: TaoDichVuInput) {
  const existing = await prisma.dichVu.findUnique({
    where: { tenDichVu: input.tenDichVu },
  });
  if (existing) {
    throw new AppError(409, `Dịch vụ "${input.tenDichVu}" đã tồn tại.`);
  }

  const dichVu = await prisma.dichVu.create({
    data: {
      tenDichVu: input.tenDichVu,
      donGia: new Decimal(input.donGia),
      donVi: input.donVi,
      moTa: input.moTa,
    },
  });

  return { success: true, data: dichVu };
}

// ── Cập nhật dịch vụ ─────────────────────────────────────────
export async function capNhatDichVu(
  idDichVu: string,
  input: CapNhatDichVuInput,
) {
  const dichVu = await prisma.dichVu.findUnique({ where: { idDichVu } });
  if (!dichVu) {
    throw new AppError(404, `Không tìm thấy dịch vụ: ${idDichVu}`);
  }

  const updated = await prisma.dichVu.update({
    where: { idDichVu },
    data: {
      ...(input.tenDichVu !== undefined && { tenDichVu: input.tenDichVu }),
      ...(input.donGia !== undefined && { donGia: new Decimal(input.donGia) }),
      ...(input.donVi !== undefined && { donVi: input.donVi }),
      ...(input.moTa !== undefined && { moTa: input.moTa }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });

  return { success: true, data: updated };
}

// ── Thêm dịch vụ vào phiếu đặt phòng ────────────────────────
export async function themDichVuVaoPhieu(input: ThemDichVuVaoPhieuInput) {
  const { maDatPhong, idDichVu, soLuong } = input;

  if (soLuong <= 0) {
    throw new AppError(400, "Số lượng phải lớn hơn 0.");
  }

  // Kiểm tra phiếu đặt phòng
  const phieu = await prisma.phieuDatPhong.findUnique({
    where: { maDatPhong },
    select: { maDatPhong: true, trangThai: true },
  });
  if (!phieu) {
    throw new AppError(404, `Không tìm thấy phiếu đặt phòng: ${maDatPhong}`);
  }
  if (phieu.trangThai !== "DaCheckIn") {
    throw new AppError(
      400,
      "Chỉ có thể thêm dịch vụ khi khách đang ở (DaCheckIn).",
    );
  }

  // Lấy dịch vụ (snapshot giá hiện tại)
  const dichVu = await prisma.dichVu.findUnique({
    where: { idDichVu },
    select: { idDichVu: true, tenDichVu: true, donGia: true, isActive: true },
  });
  if (!dichVu || !dichVu.isActive) {
    throw new AppError(404, `Dịch vụ không tồn tại hoặc đã ngừng hoạt động.`);
  }

  const chiTiet = await prisma.chiTietDichVu.create({
    data: {
      maDatPhong,
      idDichVu,
      soLuong,
      donGia: dichVu.donGia, // snapshot
    },
    include: { dichVu: { select: { tenDichVu: true, donVi: true } } },
  });

  return { success: true, data: chiTiet };
}

// ── Lấy danh sách dịch vụ đã dùng theo phiếu ────────────────
export async function layDichVuCuaPhieu(maDatPhong: string) {
  const chiTiet = await prisma.chiTietDichVu.findMany({
    where: { maDatPhong },
    include: { dichVu: { select: { tenDichVu: true, donVi: true } } },
    orderBy: { ngaySuDung: "desc" },
  });

  const tongTienDichVu = chiTiet.reduce(
    (sum, item) => sum + parseFloat(item.donGia.toString()) * item.soLuong,
    0,
  );

  return { success: true, data: chiTiet, tongTienDichVu };
}
