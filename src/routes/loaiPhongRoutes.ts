// src/routes/loaiPhongRoutes.ts

import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate, requireRole } from "../middleware/authMiddleware";
import {
  listLoaiPhong,
  getLoaiPhong,
  createLoaiPhong,
  updateLoaiPhong,
  deleteLoaiPhong,
} from "../controllers/loaiPhongController";

const router = Router();

// GET  /api/loai-phong
router.get("/", listLoaiPhong);

// GET  /api/loai-phong/:id
router.get("/:id", [param("id").notEmpty()], getLoaiPhong);

// POST /api/loai-phong
router.post(
  "/",
  authenticate,
  requireRole("QuanLy"),
  [
    body("tenLoai").notEmpty().withMessage("tenLoai là bắt buộc.").trim(),
    body("sucChua")
      .optional()
      .isInt({ min: 1 })
      .withMessage("sucChua phải là số nguyên dương."),
    body("soGiuong")
      .optional()
      .isInt({ min: 1 })
      .withMessage("soGiuong phải là số nguyên dương."),
    body("dienTich").optional().isFloat({ min: 0 }),
    body("albumAnh").optional({ nullable: true }).isString(),
  ],
  createLoaiPhong,
);

// PUT  /api/loai-phong/:id
router.put(
  "/:id",
  authenticate,
  requireRole("QuanLy"),
  [
    param("id").notEmpty(),
    body("soGiuong").optional().isInt({ min: 1 }),
    body("albumAnh").optional({ nullable: true }).isString(),
  ],
  updateLoaiPhong,
);

// DELETE /api/loai-phong/:id
router.delete(
  "/:id",
  authenticate,
  requireRole("QuanLy"),
  [param("id").notEmpty()],
  deleteLoaiPhong,
);

export default router;
