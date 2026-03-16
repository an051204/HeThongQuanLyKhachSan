// src/routes/customerRoutes.ts

import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate, requireRole } from "../middleware/authMiddleware";
import {
  upsertCustomer,
  listCustomers,
  getCustomer,
} from "../controllers/customerController";

const router = Router();

const upsertValidation = [
  body("hoTen").notEmpty().withMessage("hoTen là bắt buộc.").isString().trim(),
  body("sdt").notEmpty().withMessage("sdt là bắt buộc."),
  body("email").isEmail().withMessage("email không hợp lệ.").normalizeEmail(),
  body("cccd_passport")
    .notEmpty()
    .withMessage("cccd_passport là bắt buộc.")
    .isString()
    .trim(),
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
