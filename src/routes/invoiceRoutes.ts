// src/routes/invoiceRoutes.ts

import { Router } from "express";
import { body, param } from "express-validator";
import {
  listInvoices,
  getInvoice,
  payInvoice,
  exportInvoice,
} from "../controllers/invoiceController";

const router = Router();

// GET  /api/hoa-don          — danh sách (?trangThai=)
router.get("/", listInvoices);

// GET  /api/hoa-don/:maHoaDon — chi tiết
router.get("/:maHoaDon", [param("maHoaDon").notEmpty()], getInvoice);

// PATCH /api/hoa-don/:maHoaDon/thanh-toan — đánh dấu đã thanh toán
router.patch(
  "/:maHoaDon/thanh-toan",
  [
    param("maHoaDon").notEmpty(),
    body("phuongThucTT").optional().isIn(["TienMat", "ChuyenKhoan", "VNPay"]),
  ],
  payInvoice,
);

// GET /api/hoa-don/:maHoaDon/xuat — xuất hóa đơn HTML
router.get("/:maHoaDon/xuat", [param("maHoaDon").notEmpty()], exportInvoice);

export default router;
