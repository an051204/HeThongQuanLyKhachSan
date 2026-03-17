// src/routes/roomRoutes.ts

import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate, requireRole } from "../middleware/authMiddleware";
import {
  listPhong,
  getPhong,
  createPhong,
  updatePhong,
  deletePhong,
  cleanRoom,
  searchPhongTrong,
  getRoomSuggestions,
} from "../controllers/roomController";

const router = Router();

const createPhongValidation = [
  body("soPhong")
    .notEmpty()
    .withMessage("soPhong là bắt buộc.")
    .isString()
    .trim()
    .matches(/^\d{3}$/)
    .withMessage("soPhong phải gồm đúng 3 chữ số (ví dụ: 101)."),
  body("idLoaiPhong")
    .notEmpty()
    .withMessage("idLoaiPhong là bắt buộc.")
    .isString()
    .trim(),
  body("giaPhong")
    .isFloat({ min: 0 })
    .withMessage("giaPhong phải là số không âm."),
];

// GET  /api/phong          — danh sách (filter ?tinhTrang=)
router.get("/", listPhong);

// GET  /api/phong/trong    — tìm phòng trống theo ngày (?ngayDen=&ngayDi=)
router.get("/trong", searchPhongTrong);

// GET  /api/phong/goi-y    — loại phòng đặt nhiều + phòng nổi bật
router.get("/goi-y", getRoomSuggestions);

// GET  /api/phong/:soPhong — chi tiết
router.get("/:soPhong", [param("soPhong").notEmpty()], getPhong);

// POST /api/phong          — tạo phòng mới
router.post(
  "/",
  authenticate,
  requireRole("QuanLy"),
  createPhongValidation,
  createPhong,
);

// PUT  /api/phong/:soPhong — cập nhật phòng
router.put(
  "/:soPhong",
  authenticate,
  requireRole("QuanLy"),
  [param("soPhong").notEmpty()],
  updatePhong,
);

// DELETE /api/phong/:soPhong — xóa phòng
router.delete(
  "/:soPhong",
  authenticate,
  requireRole("QuanLy"),
  [param("soPhong").notEmpty()],
  deletePhong,
);

// PATCH /api/phong/:soPhong/don-dep — đánh dấu phòng đã dọn dẹp
router.patch(
  "/:soPhong/don-dep",
  authenticate,
  requireRole("QuanLy", "LeTan", "BuongPhong"),
  [param("soPhong").notEmpty()],
  cleanRoom,
);

export default router;
