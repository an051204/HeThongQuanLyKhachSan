// src/routes/bookingMomoRoutes.ts

import { Router } from "express";
import { body, param } from "express-validator";
import {
  authenticate,
  requireCheckoutPermission,
  requireRole,
} from "../middleware/authMiddleware";
import {
  createBookingAndPayDeposit,
  handleBookingMomoCallback,
  handleBookingMomoIpn,
} from "../controllers/bookingMomoController";
import { checkoutBookingById } from "../controllers/checkoutController";
import { checkInBookingById } from "../controllers/checkinController";
import {
  getBookingById,
  getBookingHistory,
} from "../controllers/bookingController";

const router = Router();

const createBookingValidation = [
  body("roomId")
    .notEmpty()
    .withMessage("roomId là bắt buộc.")
    .isString()
    .trim(),
  body("checkInDate")
    .notEmpty()
    .withMessage("checkInDate là bắt buộc.")
    .isISO8601()
    .withMessage("checkInDate phải theo chuẩn ISO 8601."),
  body("checkOutDate")
    .notEmpty()
    .withMessage("checkOutDate là bắt buộc.")
    .isISO8601()
    .withMessage("checkOutDate phải theo chuẩn ISO 8601."),
  body("totalPrice")
    .notEmpty()
    .withMessage("totalPrice là bắt buộc.")
    .isFloat({ min: 1 })
    .withMessage("totalPrice phải là số dương."),
  body("customer").isObject().withMessage("customer là bắt buộc."),
  body("customer.hoTen")
    .notEmpty()
    .withMessage("customer.hoTen là bắt buộc.")
    .isString()
    .trim(),
  body("customer.sdt")
    .notEmpty()
    .withMessage("customer.sdt là bắt buộc.")
    .isString()
    .trim(),
  body("customer.email")
    .notEmpty()
    .withMessage("customer.email là bắt buộc.")
    .isEmail()
    .withMessage("customer.email không hợp lệ.")
    .normalizeEmail(),
  body("customer.cccd_passport")
    .notEmpty()
    .withMessage("customer.cccd_passport là bắt buộc.")
    .isString()
    .trim(),
  body("customer.diaChi")
    .notEmpty()
    .withMessage("customer.diaChi là bắt buộc.")
    .isString()
    .trim(),
  body("paymentMethod")
    .optional()
    .isIn(["QR", "CARD"])
    .withMessage("paymentMethod chỉ chấp nhận QR hoặc CARD."),
  body("note").optional().isString(),
];

const checkoutBookingValidation = [
  param("id").notEmpty().withMessage("id booking là bắt buộc.").isString(),
  body("actualCheckOutDate")
    .optional()
    .isISO8601()
    .withMessage("actualCheckOutDate phải theo định dạng ISO 8601."),
  body("phuPhi")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("phuPhi phải là số không âm."),
  body("surcharges")
    .optional()
    .isArray()
    .withMessage("surcharges phải là mảng nếu được truyền lên."),
  body("surcharges.*.tenDichVu")
    .optional()
    .isString()
    .notEmpty()
    .withMessage("surcharges[].tenDichVu là bắt buộc."),
  body("surcharges.*.soTien")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("surcharges[].soTien phải là số không âm."),
  body("surcharges.*.ghiChu").optional().isString(),
];

const bookingIdValidation = [
  param("id").notEmpty().withMessage("id booking là bắt buộc.").isString(),
];

// POST /api/bookings/create
router.post("/create", createBookingValidation, createBookingAndPayDeposit);

// POST /api/bookings/momo-ipn
router.post("/momo-ipn", handleBookingMomoIpn);

// GET /api/bookings/momo-callback
router.get("/momo-callback", handleBookingMomoCallback);

// GET /api/bookings/history
router.get(
  "/history",
  authenticate,
  requireRole("LeTan", "QuanLy"),
  getBookingHistory,
);

// GET /api/bookings/:id
router.get(
  "/:id",
  authenticate,
  requireRole("LeTan", "QuanLy"),
  bookingIdValidation,
  getBookingById,
);

// POST /api/bookings/:id/checkin
router.post(
  "/:id/checkin",
  authenticate,
  requireRole("LeTan", "QuanLy"),
  bookingIdValidation,
  checkInBookingById,
);

// POST /api/bookings/:id/checkout
router.post(
  "/:id/checkout",
  authenticate,
  requireCheckoutPermission,
  checkoutBookingValidation,
  checkoutBookingById,
);

export default router;
