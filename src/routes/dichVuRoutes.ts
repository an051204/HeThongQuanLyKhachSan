// src/routes/dichVuRoutes.ts

import { Router } from "express";
import { body, param } from "express-validator";
import {
  listDichVu,
  createDichVu,
  updateDichVu,
  addDichVuToBooking,
  getDichVuOfBooking,
} from "../controllers/dichVuController";

const router = Router();

// GET  /api/dich-vu               — danh sách (?tatCa=true để bao gồm đã ẩn)
router.get("/", listDichVu);

// POST /api/dich-vu               — tạo dịch vụ mới
router.post(
  "/",
  [
    body("tenDichVu").notEmpty().withMessage("tenDichVu là bắt buộc.").trim(),
    body("donGia")
      .isFloat({ min: 0 })
      .withMessage("donGia phải là số không âm."),
    body("donVi").notEmpty().withMessage("donVi là bắt buộc.").trim(),
  ],
  createDichVu,
);

// PUT  /api/dich-vu/:id           — cập nhật dịch vụ
router.put("/:id", [param("id").notEmpty()], updateDichVu);

// GET  /api/dich-vu/phieu/:maDatPhong    — dịch vụ đã dùng của phiếu
router.get(
  "/phieu/:maDatPhong",
  [param("maDatPhong").notEmpty()],
  getDichVuOfBooking,
);

// POST /api/dich-vu/phieu/:maDatPhong    — thêm dịch vụ vào phiếu
router.post(
  "/phieu/:maDatPhong",
  [
    param("maDatPhong").notEmpty(),
    body("idDichVu").notEmpty().withMessage("idDichVu là bắt buộc."),
    body("soLuong").isInt({ min: 1 }).withMessage("soLuong phải >= 1."),
  ],
  addDichVuToBooking,
);

export default router;
