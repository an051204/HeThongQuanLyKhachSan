// ============================================================
// src/routes/paymentRoutes.ts
// Payment Routes - MoMo Integration
// ============================================================

import { Router } from "express";
import {
  createPayment,
  handleIpnCallback,
  getPaymentStatus,
  getTransactionDetails,
  verifyPaymentReturn,
} from "../controllers/paymentController";

const router = Router();

/**
 * Public routes (no authentication required)
 */

// POST /api/payment/momo/create - Create payment request
// Body: { maHoaDon: string, soTien: number, moTa?: string }
router.post("/momo/create", createPayment);

// POST /api/payment/momo/ipn - MoMo IPN callback
// This is called automatically by MoMo system
router.post("/momo/ipn", handleIpnCallback);

// POST /api/payment/momo/verify-return - Verify payment return
// Frontend calls this after user returns from payment
router.post("/momo/verify-return", verifyPaymentReturn);

// GET /api/payment/momo/status/:orderId - Get payment status
router.get("/momo/status/:orderId", getPaymentStatus);

// GET /api/payment/momo/transaction/:orderId - Get transaction details
router.get("/momo/transaction/:orderId", getTransactionDetails);

export default router;
