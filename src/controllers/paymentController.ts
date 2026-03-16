// ============================================================
// src/controllers/paymentController.ts
// MoMo Payment Controller
// ============================================================

import { Request, Response, NextFunction } from "express";
import {
  createMoMoPaymentRequest,
  handleMoMoIpn,
  queryMoMoPaymentStatus,
} from "../services/paymentService";
import { AppError } from "../middleware/errorHandler";
import prisma from "../lib/db";

/**
 * POST /api/payment/momo/create
 * Tạo request thanh toán MoMo
 */
export async function createPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { maHoaDon, soTien, moTa } = req.body;

    // Validate input
    if (!maHoaDon || typeof maHoaDon !== "string") {
      throw new AppError(400, "Invalid maHoaDon");
    }

    if (!soTien || typeof soTien !== "number" || soTien <= 0) {
      throw new AppError(400, "Invalid soTien");
    }

    const description = moTa || "Thanh toán hóa đơn khách sạn";

    const { payUrl, requestId } = await createMoMoPaymentRequest(
      maHoaDon,
      soTien,
      description,
    );

    res.json({
      success: true,
      data: {
        payUrl,
        requestId,
        maHoaDon,
        soTien,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/payment/momo/ipn
 * Receive IPN callback from MoMo
 * This is public endpoint (no auth required)
 */
export async function handleIpnCallback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ipnData = req.body;

    console.log("[Payment IPN] Received callback:", ipnData);

    const result = await handleMoMoIpn(ipnData);

    // Always return 200 to MoMo
    res.status(200).json({
      resultCode: result.success ? 0 : 1,
      message: result.message,
    });
  } catch (error) {
    console.error("[Payment IPN] Unexpected error:", error);
    // Always return 200 to MoMo even on error
    res.status(200).json({
      resultCode: 1,
      message: "Error processing IPN",
    });
  }
}

/**
 * GET /api/payment/momo/status/:orderId
 * Query payment status
 */
export async function getPaymentStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { orderId } = req.params;

    if (!orderId || typeof orderId !== "string") {
      throw new AppError(400, "Invalid orderId");
    }

    const status = await queryMoMoPaymentStatus(orderId);

    res.json({
      success: true,
      data: {
        orderId,
        ...status,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/payment/momo/transaction/:orderId
 * Get transaction details
 */
export async function getTransactionDetails(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { orderId } = req.params;

    if (!orderId || typeof orderId !== "string") {
      throw new AppError(400, "Invalid orderId");
    }

    const transaction = await prisma.momoTransaction.findUnique({
      where: { orderId },
    });

    if (!transaction) {
      throw new AppError(404, "Transaction not found");
    }

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/payment/momo/verify-return
 * Verify payment on return from MoMo gateway
 * Frontend calls this after user returns from payment
 */
export async function verifyPaymentReturn(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { orderId, maHoaDon } = req.body;

    if (!orderId || !maHoaDon) {
      throw new AppError(400, "Missing orderId or maHoaDon");
    }

    // Query transaction status
    const transaction = await prisma.momoTransaction.findUnique({
      where: { orderId },
    });

    if (!transaction) {
      throw new AppError(404, "Transaction not found");
    }

    // Get invoice status
    const hoaDon = await prisma.hoaDon.findUnique({
      where: { maHoaDon },
    });

    if (!hoaDon) {
      throw new AppError(404, "Invoice not found");
    }

    res.json({
      success: true,
      data: {
        transaction: {
          orderId: transaction.orderId,
          status: transaction.status,
          amount: transaction.amount,
          transId: transaction.transId,
        },
        invoice: {
          maHoaDon: hoaDon.maHoaDon,
          trangThai: hoaDon.trangThai,
          phuongThucTT: hoaDon.phuongThucTT,
          tongTien: hoaDon.tongTien.toNumber(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
