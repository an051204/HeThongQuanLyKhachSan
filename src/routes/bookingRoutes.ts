// src/routes/bookingRoutes.ts

import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate, requireRole } from "../middleware/authMiddleware";
import {
  createBooking,
  listBookings,
  getBooking,
  cancelBooking,
  confirmBooking,
} from "../controllers/bookingController";

const router = Router();

// Validation rules cho tạo phiếu đặt phòng
const createBookingValidation = [
  body("idKhachHang")
    .notEmpty()
    .withMessage("idKhachHang là bắt buộc.")
    .isString()
    .trim(),
  body("soPhong")
    .notEmpty()
    .withMessage("soPhong là bắt buộc.")
    .isString()
    .trim(),
  body("ngayDen")
    .notEmpty()
    .withMessage("ngayDen là bắt buộc.")
    .isISO8601()
    .withMessage("ngayDen phải theo định dạng ISO 8601 (vd: 2026-04-01)."),
  body("ngayDi")
    .notEmpty()
    .withMessage("ngayDi là bắt buộc.")
    .isISO8601()
    .withMessage("ngayDi phải theo định dạng ISO 8601."),
  body("tienCoc")
    .notEmpty()
    .withMessage("tienCoc là bắt buộc.")
    .isFloat({ min: 0 })
    .withMessage("tienCoc phải là số không âm."),
];

// POST   /api/dat-phong          — Tạo phiếu đặt phòng
router.post("/", createBookingValidation, createBooking);

// GET    /api/dat-phong          — Danh sách phiếu (có thể filter ?trangThai=)
router.get("/", authenticate, requireRole("LeTan", "QuanLy"), listBookings);

// GET    /api/dat-phong/:maDatPhong — Chi tiết một phiếu
router.get(
  "/:maDatPhong",
  authenticate,
  requireRole("LeTan", "QuanLy"),
  [param("maDatPhong").notEmpty().isString()],
  getBooking,
);

// DELETE /api/dat-phong/:maDatPhong — Hủy phiếu
router.delete(
  "/:maDatPhong",
  authenticate,
  requireRole("LeTan", "QuanLy"),
  [param("maDatPhong").notEmpty().isString()],
  cancelBooking,
);

// PATCH  /api/dat-phong/:maDatPhong/xac-nhan — Xác nhận phiếu
router.patch(
  "/:maDatPhong/xac-nhan",
  authenticate,
  requireRole("LeTan", "QuanLy"),
  [param("maDatPhong").notEmpty().isString()],
  confirmBooking,
);

export default router;
