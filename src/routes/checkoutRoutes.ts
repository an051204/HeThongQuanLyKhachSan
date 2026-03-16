// src/routes/checkoutRoutes.ts

import { Router } from "express";
import { body, param } from "express-validator";
import {
  checkOut,
  checkoutGenerateQr,
  checkoutMomoIpn,
  checkoutOffline,
  getCheckoutStatus,
} from "../controllers/checkoutController";
import {
  authenticate,
  requireCheckoutPermission,
} from "../middleware/authMiddleware";

const router = Router();

const offlineCheckoutValidation = [
  body("invoiceId").notEmpty().withMessage("invoiceId là bắt buộc.").isString(),
  body("paymentMethod")
    .notEmpty()
    .withMessage("paymentMethod là bắt buộc.")
    .isIn(["CASH", "POS"])
    .withMessage("paymentMethod chỉ chấp nhận CASH hoặc POS."),
];

const generateQrValidation = [
  body("invoiceId").notEmpty().withMessage("invoiceId là bắt buộc.").isString(),
];

const checkoutStatusValidation = [
  param("invoiceId")
    .notEmpty()
    .withMessage("invoiceId là bắt buộc.")
    .isString(),
];

const checkOutValidation = [
  param("maDatPhong")
    .notEmpty()
    .withMessage("maDatPhong là bắt buộc.")
    .isString(),
  body("phuPhi")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("phuPhi phải là số không âm."),
];

// POST /api/checkout/offline
router.post(
  "/offline",
  authenticate,
  requireCheckoutPermission,
  offlineCheckoutValidation,
  checkoutOffline,
);

// POST /api/checkout/generate-qr
router.post(
  "/generate-qr",
  authenticate,
  requireCheckoutPermission,
  generateQrValidation,
  checkoutGenerateQr,
);

// POST /api/checkout/momo-ipn
router.post("/momo-ipn", checkoutMomoIpn);

// GET /api/checkout/status/:invoiceId
router.get(
  "/status/:invoiceId",
  authenticate,
  requireCheckoutPermission,
  checkoutStatusValidation,
  getCheckoutStatus,
);

// PATCH /api/check-out/:maDatPhong — Trả phòng (Check-out)
router.patch(
  "/:maDatPhong",
  authenticate,
  requireCheckoutPermission,
  checkOutValidation,
  checkOut,
);

export default router;
