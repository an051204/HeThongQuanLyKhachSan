// src/routes/authRoutes.ts

import { Router } from "express";
import { body } from "express-validator";
import {
  login,
  getMe,
  updateMe,
  register,
  registerCustomer,
  changePassword,
  listNhanVien,
} from "../controllers/authController";
import { authenticate, requireRole } from "../middleware/authMiddleware";

const router = Router();

// POST /api/auth/login — đăng nhập, nhận JWT
router.post(
  "/login",
  [
    body("taiKhoan")
      .notEmpty()
      .withMessage("Tài khoản là bắt buộc.")
      .isString()
      .trim(),
    body("matKhau").notEmpty().withMessage("Mật khẩu là bắt buộc."),
  ],
  login,
);

// POST /api/auth/register-customer — đăng ký khách hàng public
router.post(
  "/register-customer",
  [
    body("hoTen")
      .notEmpty()
      .withMessage("Họ tên là bắt buộc.")
      .isString()
      .trim(),
    body("taiKhoan")
      .notEmpty()
      .withMessage("Email/Tài khoản là bắt buộc.")
      .isString()
      .trim(),
    body("matKhau")
      .isLength({ min: 6 })
      .withMessage("Mật khẩu phải có ít nhất 6 ký tự."),
    body("sdt")
      .optional()
      .isString()
      .trim()
      .matches(/^(0|\+84)[0-9]{8,9}$/)
      .withMessage("Số điện thoại không hợp lệ."),
  ],
  registerCustomer,
);

// GET /api/auth/me — thông tin người đang đăng nhập
router.get("/me", authenticate, getMe);

// PATCH /api/auth/me — cập nhật email/sdt cá nhân
router.patch(
  "/me",
  authenticate,
  [
    body("email").optional().isEmail().withMessage("Email không hợp lệ."),
    body("sdt")
      .optional()
      .isString()
      .trim()
      .matches(/^(0|\+84)[0-9]{8,9}$/)
      .withMessage("Số điện thoại không hợp lệ."),
  ],
  updateMe,
);

// POST /api/auth/register — tạo nhân viên mới (QuanLy only, không tạo thêm QuanLy)
router.post(
  "/register",
  authenticate,
  requireRole("QuanLy"),
  [
    body("hoTen")
      .notEmpty()
      .withMessage("Họ tên là bắt buộc.")
      .isString()
      .trim(),
    body("taiKhoan")
      .notEmpty()
      .withMessage("Tài khoản là bắt buộc.")
      .isString()
      .trim(),
    body("matKhau")
      .isLength({ min: 6 })
      .withMessage("Mật khẩu phải có ít nhất 6 ký tự."),
    body("vaiTro")
      .isIn(["LeTan", "BuongPhong", "KeToan"])
      .withMessage('Vai trò phải là "LeTan", "BuongPhong" hoặc "KeToan".'),
  ],
  register,
);

// PATCH /api/auth/doi-mat-khau — đổi mật khẩu
router.patch(
  "/doi-mat-khau",
  authenticate,
  [
    body("matKhauCu").notEmpty().withMessage("Mật khẩu cũ là bắt buộc."),
    body("matKhauMoi")
      .isLength({ min: 6 })
      .withMessage("Mật khẩu mới phải có ít nhất 6 ký tự."),
  ],
  changePassword,
);

// GET /api/auth/nhan-vien — danh sách nhân viên (QuanLy only)
router.get("/nhan-vien", authenticate, requireRole("QuanLy"), listNhanVien);

export default router;
