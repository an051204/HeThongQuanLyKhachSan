// src/controllers/authController.ts

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  dangNhap,
  capNhatThongTinCaNhan,
  dangKyKhachHang,
  dangKyNhanVien,
  doiMatKhau,
  layDanhSachNhanVien,
  khoiTaoAdmin,
} from "../services/authService";

// POST /api/auth/login
export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }
  try {
    const result = await dangNhap(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me — thông tin nhân viên hiện tại
export async function getMe(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: req.user });
}

// POST /api/auth/register — tạo nhân viên mới (QuanLy only)
export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }
  try {
    const result = await dangKyNhanVien(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/register-customer — đăng ký khách hàng public
export async function registerCustomer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }

  try {
    const result = await dangKyKhachHang({
      hoTen: req.body.hoTen,
      taiKhoan: req.body.taiKhoan,
      matKhau: req.body.matKhau,
      sdt: req.body.sdt,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/auth/doi-mat-khau — đổi mật khẩu
export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }
  try {
    if (!req.user?.idNhanVien) {
      res.status(401).json({ success: false, message: "Chưa xác thực." });
      return;
    }

    const result = await doiMatKhau(
      req.user.idNhanVien,
      req.body.matKhauCu,
      req.body.matKhauMoi,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/auth/me — cập nhật thông tin cá nhân
export async function updateMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }

  try {
    if (!req.user?.idNhanVien) {
      res.status(401).json({ success: false, message: "Chưa xác thực." });
      return;
    }

    const result = await capNhatThongTinCaNhan(req.user.idNhanVien, {
      sdt: req.body.sdt,
      email: req.body.email,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/nhan-vien — danh sách nhân viên (QuanLy only)
export async function listNhanVien(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await layDanhSachNhanVien();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/setup — khởi tạo admin đầu tiên (chỉ dùng khi DB còn rỗng)
export async function setup(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }
  try {
    const result = await khoiTaoAdmin(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
