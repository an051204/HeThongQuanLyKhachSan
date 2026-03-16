// ============================================================
// src/services/doiTacService.ts
// Quản lý đối tác B2B (công ty du lịch, OTA,...)
// ============================================================

import { randomBytes } from "crypto";
import prisma from "../lib/db";
import { AppError } from "../middleware/errorHandler";

export interface TaoDoiTacInput {
  tenDoiTac: string;
  email: string;
  sdt?: string;
  diaChi?: string;
  tyLeChietKhau?: number;
  ghiChu?: string;
}

export interface CapNhatDoiTacInput {
  tenDoiTac?: string;
  sdt?: string;
  diaChi?: string;
  tyLeChietKhau?: number;
  trangThai?: "DangHoatDong" | "TamNgung" | "DaKhoa";
  ghiChu?: string;
}

// ── Danh sách đối tác ────────────────────────────────────────
export async function layDanhSachDoiTac() {
  const list = await prisma.doiTac.findMany({
    include: {
      _count: { select: { phieuDatPhong: true } },
    },
    orderBy: { tenDoiTac: "asc" },
  });
  return { success: true, data: list };
}

// ── Chi tiết đối tác ─────────────────────────────────────────
export async function layChiTietDoiTac(idDoiTac: string) {
  const doiTac = await prisma.doiTac.findUnique({
    where: { idDoiTac },
    include: {
      phieuDatPhong: {
        include: {
          khachHang: { select: { hoTen: true, email: true } },
          phong: { select: { soPhong: true } },
        },
        orderBy: { thoiGianDat: "desc" },
        take: 20,
      },
    },
  });
  if (!doiTac) {
    throw new AppError(404, `Không tìm thấy đối tác: ${idDoiTac}`);
  }
  return { success: true, data: doiTac };
}

// ── Tạo đối tác ──────────────────────────────────────────────
export async function taoDoiTac(input: TaoDoiTacInput) {
  const existing = await prisma.doiTac.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new AppError(409, `Email đối tác "${input.email}" đã tồn tại.`);
  }

  if (
    input.tyLeChietKhau !== undefined &&
    (input.tyLeChietKhau < 0 || input.tyLeChietKhau > 100)
  ) {
    throw new AppError(400, "Tỷ lệ chiết khấu phải từ 0 đến 100.");
  }

  const doiTac = await prisma.doiTac.create({
    data: {
      tenDoiTac: input.tenDoiTac,
      email: input.email,
      sdt: input.sdt,
      diaChi: input.diaChi,
      tyLeChietKhau: input.tyLeChietKhau ?? 0,
      ghiChu: input.ghiChu,
    },
  });

  return { success: true, data: doiTac };
}

// ── Cập nhật đối tác ─────────────────────────────────────────
export async function capNhatDoiTac(
  idDoiTac: string,
  input: CapNhatDoiTacInput,
) {
  const doiTac = await prisma.doiTac.findUnique({ where: { idDoiTac } });
  if (!doiTac) {
    throw new AppError(404, `Không tìm thấy đối tác: ${idDoiTac}`);
  }

  const updated = await prisma.doiTac.update({
    where: { idDoiTac },
    data: {
      ...(input.tenDoiTac !== undefined && { tenDoiTac: input.tenDoiTac }),
      ...(input.sdt !== undefined && { sdt: input.sdt }),
      ...(input.diaChi !== undefined && { diaChi: input.diaChi }),
      ...(input.tyLeChietKhau !== undefined && {
        tyLeChietKhau: input.tyLeChietKhau,
      }),
      ...(input.trangThai !== undefined && { trangThai: input.trangThai }),
      ...(input.ghiChu !== undefined && { ghiChu: input.ghiChu }),
    },
  });

  return { success: true, data: updated };
}

// ── Tạo / làm mới API Key ─────────────────────────────────────
export async function taoApiKey(idDoiTac: string) {
  const doiTac = await prisma.doiTac.findUnique({ where: { idDoiTac } });
  if (!doiTac) {
    throw new AppError(404, `Không tìm thấy đối tác: ${idDoiTac}`);
  }

  // Tạo API key ngẫu nhiên 32 bytes hex
  const apiKey = randomBytes(32).toString("hex");

  await prisma.doiTac.update({
    where: { idDoiTac },
    data: { apiKey },
  });

  return { success: true, data: { apiKey } };
}
