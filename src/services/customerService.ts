// ── Xóa khách hàng theo id ────────────────────────────────
export async function xoaKhachHang(idKhachHang: string) {
  // Kiểm tra tồn tại
  const kh = await prisma.khachHang.findUnique({ where: { idKhachHang } });
  if (!kh) {
    throw new AppError(404, `Không tìm thấy khách hàng: ${idKhachHang}`);
  }
  // Lấy danh sách các phiếu đặt phòng liên quan
  const phieuList = await prisma.phieuDatPhong.findMany({
    where: { idKhachHang },
    select: { maDatPhong: true },
  });
  const maDatPhongList = phieuList.map((p) => p.maDatPhong);
  // Xóa hóa đơn liên quan trước (nếu có)
  if (maDatPhongList.length > 0) {
    await prisma.hoaDon.deleteMany({
      where: { maDatPhong: { in: maDatPhongList } },
    });
  }
  // Xóa toàn bộ phiếu đặt phòng liên quan
  await prisma.phieuDatPhong.deleteMany({ where: { idKhachHang } });
  // Xóa khách hàng
  await prisma.khachHang.delete({ where: { idKhachHang } });
  return {
    success: true,
    message: "Đã xóa khách hàng, các phiếu đặt phòng và hóa đơn liên quan.",
  };
}
// ============================================================
// src/services/customerService.ts
// CRUD khách hàng + upsert by email
// ============================================================

import prisma from "../lib/db";
import { AppError } from "../middleware/errorHandler";

export interface UpsertKhachHangInput {
  hoTen: string;
  sdt: string;
  email: string;
  cccd_passport: string;
  diaChi: string;
}

// ── Upsert khách hàng theo email ─────────────────────────────
export async function upsertKhachHang(input: UpsertKhachHangInput) {
  const { hoTen, sdt, email, cccd_passport, diaChi } = input;

  // Tìm theo email trước
  const existing = await prisma.khachHang.findUnique({ where: { email } });

  if (existing) {
    // Cập nhật thông tin mới nhất
    const updated = await prisma.khachHang.update({
      where: { email },
      data: { hoTen, sdt, cccd_passport, diaChi },
    });
    return {
      success: true,
      data: { idKhachHang: updated.idKhachHang, isNew: false },
    };
  }

  const newKH = await prisma.khachHang.create({
    data: { hoTen, sdt, email, cccd_passport, diaChi },
  });

  return {
    success: true,
    data: { idKhachHang: newKH.idKhachHang, isNew: true },
  };
}

// ── Danh sách khách hàng ─────────────────────────────────────
export async function layDanhSachKhachHang(search?: string) {
  const where = search
    ? {
        OR: [
          { hoTen: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { sdt: { contains: search } },
          { cccd_passport: { contains: search } },
        ],
      }
    : undefined;

  const list = await prisma.khachHang.findMany({
    where,
    include: {
      _count: { select: { phieuDatPhong: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { success: true, data: list };
}

// ── Chi tiết khách hàng + lịch sử đặt phòng ─────────────────
export async function layChiTietKhachHang(idKhachHang: string) {
  const kh = await prisma.khachHang.findUnique({
    where: { idKhachHang },
    include: {
      phieuDatPhong: {
        include: {
          phong: { select: { loaiPhong: true, giaPhong: true } },
          hoaDon: true,
        },
        orderBy: { thoiGianDat: "desc" },
      },
    },
  });

  if (!kh) {
    throw new AppError(404, `Không tìm thấy khách hàng: ${idKhachHang}`);
  }

  return { success: true, data: kh };
}
