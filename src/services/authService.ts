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

export interface DangKyKhachHangInput {
  hoTen: string;
  taiKhoan: string;
  matKhau: string;
  sdt?: string;
}

export interface CapNhatThongTinCaNhanInput {
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
      sdt: true,
      email: true,
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
    sdt: nhanVien.sdt,
    email: nhanVien.email,
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

// ── Đăng ký tài khoản khách hàng (public) ───────────────────
export async function dangKyKhachHang(input: DangKyKhachHangInput) {
  const hoTen = input.hoTen.trim();
  const taiKhoan = input.taiKhoan.trim();
  const matKhau = input.matKhau;
  const sdt = input.sdt?.trim();

  if (!hoTen) {
    throw new AppError(400, "Họ tên là bắt buộc.");
  }

  if (!taiKhoan) {
    throw new AppError(400, "Email/Tài khoản là bắt buộc.");
  }

  if (matKhau.length < 6) {
    throw new AppError(400, "Mật khẩu phải có ít nhất 6 ký tự.");
  }

  if (sdt && !/^(0|\+84)[0-9]{8,9}$/.test(sdt)) {
    throw new AppError(400, "Số điện thoại không hợp lệ.");
  }

  const existing = await prisma.nhanVien.findFirst({
    where: {
      OR: [{ taiKhoan }, { email: taiKhoan }],
    },
    select: { idNhanVien: true },
  });

  if (existing) {
    throw new AppError(409, "Email/Tài khoản đã tồn tại.");
  }

  const matKhauHash = await bcrypt.hash(matKhau, BCRYPT_ROUNDS);

  // Hardcode role to customer; never trust role from client payload.
  const khachHang = await prisma.nhanVien.create({
    data: {
      hoTen,
      taiKhoan,
      email: taiKhoan,
      sdt,
      matKhau: matKhauHash,
      vaiTro: "KhachHang",
      isActive: true,
    },
    select: {
      idNhanVien: true,
      hoTen: true,
      taiKhoan: true,
      vaiTro: true,
      sdt: true,
      email: true,
      createdAt: true,
    },
  });

  return {
    success: true,
    message: "Đăng ký tài khoản khách hàng thành công.",
    data: khachHang,
  };
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

// ── Cập nhật thông tin cá nhân ──────────────────────────────
export async function capNhatThongTinCaNhan(
  idNhanVien: string,
  input: CapNhatThongTinCaNhanInput,
) {
  const sdt = input.sdt?.trim();
  const email = input.email?.trim().toLowerCase();

  if (sdt && !/^(0|\+84)[0-9]{8,9}$/.test(sdt)) {
    throw new AppError(400, "Số điện thoại không hợp lệ.");
  }

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError(400, "Email không hợp lệ.");
    }

    const conflict = await prisma.nhanVien.findFirst({
      where: {
        idNhanVien: { not: idNhanVien },
        OR: [{ taiKhoan: email }, { email }],
      },
      select: { idNhanVien: true },
    });

    if (conflict) {
      throw new AppError(409, "Email đã được sử dụng bởi tài khoản khác.");
    }
  }

  const updated = await prisma.nhanVien.update({
    where: { idNhanVien },
    data: {
      sdt: sdt || null,
      email: email || null,
    },
    select: {
      idNhanVien: true,
      hoTen: true,
      taiKhoan: true,
      vaiTro: true,
      sdt: true,
      email: true,
    },
  });

  return {
    success: true,
    message: "Cập nhật thông tin cá nhân thành công.",
    data: updated,
  };
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
