// ============================================================
// src/services/authService.ts
// Xác thực nhân viên: đăng nhập, đăng ký, đổi mật khẩu
// ============================================================

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/db";
import { AppError } from "../middleware/errorHandler";

const BCRYPT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ??
  "7d") as jwt.SignOptions["expiresIn"];

export interface DangNhapInput {
  taiKhoan: string;
  matKhau: string;
}

export interface DangKyNhanVienInput {
  hoTen: string;
  taiKhoan: string;
  matKhau: string;
  vaiTro: "LeTan" | "BuongPhong" | "KeToan";
  sdt?: string;
  email?: string;
}

// ── Đăng nhập ────────────────────────────────────────────────
export async function dangNhap(input: DangNhapInput) {
  const { taiKhoan, matKhau } = input;

  const nhanVien = await prisma.nhanVien.findUnique({
    where: { taiKhoan },
    select: {
      idNhanVien: true,
      hoTen: true,
      taiKhoan: true,
      vaiTro: true,
      matKhau: true,
    },
  });

  if (!nhanVien) {
    // Không nói cụ thể tài khoản hay mật khẩu sai để chống brute-force
    throw new AppError(401, "Tài khoản hoặc mật khẩu không đúng.");
  }

  const matKhauHopLe = await bcrypt.compare(matKhau, nhanVien.matKhau);
  if (!matKhauHopLe) {
    throw new AppError(401, "Tài khoản hoặc mật khẩu không đúng.");
  }

  const payload = {
    idNhanVien: nhanVien.idNhanVien,
    taiKhoan: nhanVien.taiKhoan,
    hoTen: nhanVien.hoTen,
    vaiTro: nhanVien.vaiTro,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    success: true,
    data: {
      token,
      nhanVien: payload,
    },
  };
}

// ── Đăng ký nhân viên mới (chỉ QuanLy được tạo) ─────────────
export async function dangKyNhanVien(input: DangKyNhanVienInput) {
  const { hoTen, taiKhoan, matKhau } = input;
  const requestedRole = (input as { vaiTro: string }).vaiTro;

  if (requestedRole === "QuanLy") {
    throw new AppError(403, "Không thể đăng ký thêm tài khoản quản lý.");
  }

  const existing = await prisma.nhanVien.findUnique({ where: { taiKhoan } });
  if (existing) {
    throw new AppError(409, `Tài khoản "${taiKhoan}" đã tồn tại.`);
  }

  if (matKhau.length < 6) {
    throw new AppError(400, "Mật khẩu phải có ít nhất 6 ký tự.");
  }

  const matKhauHash = await bcrypt.hash(matKhau, BCRYPT_ROUNDS);

  const nhanVien = await prisma.nhanVien.create({
    data: {
      hoTen,
      taiKhoan,
      matKhau: matKhauHash,
      vaiTro: requestedRole as any,
      sdt: input.sdt,
      email: input.email,
    },
    select: {
      idNhanVien: true,
      hoTen: true,
      taiKhoan: true,
      vaiTro: true,
      createdAt: true,
    },
  });

  return { success: true, data: nhanVien };
}

// ── Đổi mật khẩu ─────────────────────────────────────────────
export async function doiMatKhau(
  idNhanVien: string,
  matKhauCu: string,
  matKhauMoi: string,
) {
  const nhanVien = await prisma.nhanVien.findUnique({
    where: { idNhanVien },
    select: { matKhau: true },
  });

  if (!nhanVien) {
    throw new AppError(404, "Không tìm thấy nhân viên.");
  }

  const hopLe = await bcrypt.compare(matKhauCu, nhanVien.matKhau);
  if (!hopLe) {
    throw new AppError(400, "Mật khẩu cũ không đúng.");
  }

  if (matKhauMoi.length < 6) {
    throw new AppError(400, "Mật khẩu mới phải có ít nhất 6 ký tự.");
  }

  const matKhauHash = await bcrypt.hash(matKhauMoi, BCRYPT_ROUNDS);
  await prisma.nhanVien.update({
    where: { idNhanVien },
    data: { matKhau: matKhauHash },
  });

  return { success: true, message: "Đổi mật khẩu thành công." };
}

// ── Lấy danh sách nhân viên ──────────────────────────────────
export async function layDanhSachNhanVien() {
  const list = await prisma.nhanVien.findMany({
    select: {
      idNhanVien: true,
      hoTen: true,
      taiKhoan: true,
      vaiTro: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return { success: true, data: list };
}

// ── Khởi tạo admin đầu tiên (chỉ chạy khi chưa có nhân viên nào) ──
export async function khoiTaoAdmin(input: {
  hoTen: string;
  taiKhoan: string;
  matKhau: string;
}) {
  const count = await prisma.nhanVien.count();
  if (count > 0) {
    throw new AppError(
      409,
      "Hệ thống đã có tài khoản. Không thể khởi tạo lại admin.",
    );
  }

  const matKhauHash = await bcrypt.hash(input.matKhau, BCRYPT_ROUNDS);
  const admin = await prisma.nhanVien.create({
    data: {
      hoTen: input.hoTen,
      taiKhoan: input.taiKhoan,
      matKhau: matKhauHash,
      vaiTro: "QuanLy",
    },
    select: { idNhanVien: true, hoTen: true, taiKhoan: true, vaiTro: true },
  });

  return {
    success: true,
    message: "Tạo tài khoản quản lý thành công.",
    data: admin,
  };
}
