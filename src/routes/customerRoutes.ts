// src/routes/customerRoutes.ts

import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate, requireRole } from "../middleware/authMiddleware";
import {
  upsertCustomer,
  listCustomers,
  getCustomer,
  deleteCustomer,
} from "../controllers/customerController";

const router = Router();

const upsertValidation = [
  body("hoTen").notEmpty().withMessage("hoTen là bắt buộc.").isString().trim(),
  body("sdt")
    .notEmpty()
    .withMessage("sdt là bắt buộc.")
    .isString()
    .trim()
    .isLength({ min: 10, max: 10 })
    .withMessage("Số điện thoại phải đủ 10 số.")
    .matches(/^(0|\+84)[0-9]{8,9}$/)
    .withMessage("Số điện thoại không hợp lệ."),
  body("email").isEmail().withMessage("email không hợp lệ.").normalizeEmail(),
  body("cccd_passport")
    .notEmpty()
    .withMessage("cccd_passport là bắt buộc.")
    .isString()
    .trim()
    .isLength({ min: 9, max: 12 })
    .withMessage("CCCD/Hộ chiếu phải từ 9 đến 12 ký tự."),
  body("diaChi")
    .notEmpty()
    .withMessage("diaChi là bắt buộc.")
    .isString()
    .trim(),
];

// POST /api/khach-hang/upsert — tạo hoặc cập nhật khách hàng
router.post("/upsert", upsertValidation, upsertCustomer);

// GET  /api/khach-hang       — danh sách (?search=)
router.get("/", authenticate, requireRole("LeTan", "QuanLy"), listCustomers);

// GET  /api/khach-hang/:id   — chi tiết + lịch sử
router.get(
  "/:id",
  authenticate,
  requireRole("LeTan", "QuanLy"),
  [param("id").notEmpty()],
  getCustomer,
);

export default router;
// DELETE /api/khach-hang/:id — xóa khách hàng (chỉ cho QuanLy)
router.delete(
  "/:id",
  authenticate,
  requireRole("QuanLy"),
  [param("id").notEmpty()],
  deleteCustomer,
);
