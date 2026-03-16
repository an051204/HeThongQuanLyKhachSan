// ============================================================
// src/services/paymentService.ts
// MoMo Payment Integration Service - Sandbox Payment
// ============================================================

import * as crypto from "crypto";
import prisma from "../lib/db";
import { AppError } from "../middleware/errorHandler";

// ============================================================
// SANDBOX MoMo CREDENTIALS
// ============================================================
const MOMO_API_ENDPOINT =
  process.env.MOMO_API_ENDPOINT ||
  "https://test-payment.momo.vn/v2/gateway/api/create";
const MOMO_PARTNER_CODE = process.env.MOMO_PARTNER_CODE || "MOMO";
const MOMO_ACCESS_KEY = process.env.MOMO_ACCESS_KEY || "F8BBA842ECF85";
const MOMO_SECRET_KEY =
  process.env.MOMO_SECRET_KEY || "K951B6PE1waDMi640xX08PD3vg6EkVlz";
const REDIRECT_URL =
  process.env.MOMO_REDIRECT_URL ||
  "http://localhost:3000/thanh-toan/momo-return";
const IPN_URL =
  process.env.MOMO_IPN_URL || "http://localhost:4000/api/payment/momo/ipn";

// ============================================================
// INTERFACES
// ============================================================

export interface MoMoPaymentRequest {
  orderId: string;
  amount: number;
  orderInfo: string;
  returnUrl: string;
  notifyUrl: string;
  extraData: string;
}

export interface MoMoPaymentResponse {
  partnerCode: string;
  requestId: string;
  orderId: string;
  errorCode: string;
  message: string;
  responseTime: number;
  payUrl: string;
  deeplink?: string;
  appLink?: string;
  qrCodeUrl?: string;
}

export interface MoMoIpnRequest {
  orderId: string;
  transId?: string;
  errorCode: number;
  message: string;
  amount: number;
  orderInfo?: string;
  orderType?: string;
  transDate?: number;
  responseTime?: number;
  extraData?: string;
  signature: string;
}

export interface MoMoQueryResponse {
  orderId: string;
  transId?: string;
  errorCode: number;
  message: string;
  responseTime?: number;
}

export interface MoMoStatusResult {
  errorCode: number;
  transId?: string;
  message?: string;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Generate raw signature string for HMAC-SHA256
 * Format: accessKey={accessKey}&amount={amount}&extraData={extraData}
 *         &ipnUrl={ipnUrl}&orderId={orderId}&orderInfo={orderInfo}
 *         &partnerCode={partnerCode}&redirectUrl={redirectUrl}
 *         &requestId={requestId}&requestType={requestType}
 */
function buildRawSignature(params: {
  accessKey: string;
  amount: number;
  extraData: string;
  ipnUrl: string;
  orderId: string;
  orderInfo: string;
  partnerCode: string;
  redirectUrl: string;
  requestId: string;
  requestType: string;
}): string {
  return (
    `accessKey=${params.accessKey}&amount=${params.amount}` +
    `&extraData=${params.extraData}&ipnUrl=${params.ipnUrl}` +
    `&orderId=${params.orderId}&orderInfo=${params.orderInfo}` +
    `&partnerCode=${params.partnerCode}&redirectUrl=${params.redirectUrl}` +
    `&requestId=${params.requestId}&requestType=${params.requestType}`
  );
}

/**
 * Sign HMAC-SHA256
 */
function signHmacSha256(rawSignature: string, secretKey: string): string {
  return crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");
}

/**
 * Generate unique request ID with timestamp
 */
function generateRequestId(): string {
  return `${MOMO_PARTNER_CODE}_${Date.now()}`;
}

/**
 * Normalize amount to VND
 */
function normalizeAmount(amount: number): number {
  return Math.floor(amount);
}

// ============================================================
// MAIN SERVICE FUNCTIONS
// ============================================================

/**
 * Tạo request thanh toán MoMo
 * @param maHoaDon - Invoice ID
 * @param soTien - Amount in VND
 * @param moTa - Payment description
 */
export async function createMoMoPaymentRequest(
  maHoaDon: string,
  soTien: number,
  moTa: string = "Thanh toán hóa đơn khách sạn",
): Promise<{ payUrl: string; requestId: string }> {
  try {
    // Validate hóa đơn exists
    const hoaDon = await prisma.hoaDon.findUnique({
      where: { maHoaDon },
    });

    if (!hoaDon) {
      throw new AppError(404, "Hóa đơn không tồn tại");
    }

    if (hoaDon.trangThai === "DaThanhToan") {
      throw new AppError(400, "Hóa đơn đã thanh toán");
    }

    const amount = normalizeAmount(soTien);
    if (amount < 1000) {
      throw new AppError(400, "Số tiền thanh toán tối thiểu 1,000 VNĐ");
    }

    const orderId = `HD_${maHoaDon}_${Date.now()}`;
    const requestId = generateRequestId();
    const extraData = Buffer.from(JSON.stringify({ maHoaDon })).toString(
      "base64",
    );

    // Build raw signature
    const rawSignature = buildRawSignature({
      accessKey: MOMO_ACCESS_KEY,
      amount,
      extraData,
      ipnUrl: IPN_URL,
      orderId,
      orderInfo: moTa,
      partnerCode: MOMO_PARTNER_CODE,
      redirectUrl: REDIRECT_URL,
      requestId,
      requestType: "captureWallet",
    });

    // Sign
    const signature = signHmacSha256(rawSignature, MOMO_SECRET_KEY);

    // Build request payload
    const requestBody = {
      partnerCode: MOMO_PARTNER_CODE,
      accessKey: MOMO_ACCESS_KEY,
      requestId,
      amount,
      orderId,
      orderInfo: moTa,
      redirectUrl: REDIRECT_URL,
      ipnUrl: IPN_URL,
      requestType: "captureWallet",
      signature,
      extraData,
      lang: "vi",
      autoCapture: true,
    };

    console.log("[MoMo] Creating payment request:", {
      orderId,
      amount,
      requestId,
    });

    // Send request to MoMo
    const response = await fetch(MOMO_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[MoMo] API Error:", errorText);
      throw new AppError(
        response.status,
        `MoMo API error: ${response.statusText}`,
      );
    }

    const result = (await response.json()) as MoMoPaymentResponse;

    // Check MoMo response
    if (result.errorCode !== "0") {
      console.error("[MoMo] Payment creation failed:", result);
      throw new AppError(400, `MoMo: ${result.message}`);
    }

    if (!result.payUrl) {
      console.error("[MoMo] No payUrl in response:", result);
      throw new AppError(500, "Không nhận được link thanh toán từ MoMo");
    }

    // Store transaction record
    await storePaymentTransaction({
      orderId,
      maHoaDon,
      amount,
      requestId,
      status: "PENDING",
      extraData,
    });

    console.log("[MoMo] Payment request created successfully:", {
      orderId,
      payUrl: result.payUrl,
    });

    return {
      payUrl: result.payUrl,
      requestId,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("[MoMo] Unexpected error:", error);
    throw new AppError(500, "Lỗi khi tạo request thanh toán");
  }
}

/**
 * Xử lý IPN callback từ MoMo
 */
export async function handleMoMoIpn(
  data: MoMoIpnRequest,
): Promise<{ success: boolean; message: string }> {
  try {
    console.log("[MoMo IPN] Received callback:", data);

    // Verify signature
    const isSignatureValid = verifyMoMoSignature(data);
    if (!isSignatureValid) {
      console.error("[MoMo IPN] Invalid signature");
      return {
        success: false,
        message: "Invalid signature",
      };
    }

    // Parse extraData to get maHoaDon
    let maHoaDon: string | null = null;
    if (data.extraData) {
      try {
        const decoded = Buffer.from(data.extraData, "base64").toString();
        const parsed = JSON.parse(decoded);
        maHoaDon = parsed.maHoaDon;
      } catch (e) {
        console.error("[MoMo IPN] Failed to decode extraData");
      }
    }

    // Update transaction record
    const transaction = await prisma.momoTransaction.findUnique({
      where: { orderId: data.orderId },
    });

    if (!transaction) {
      console.error("[MoMo IPN] Transaction not found:", data.orderId);
      return {
        success: false,
        message: "Transaction not found",
      };
    }

    // Handle success payment
    if (data.errorCode === 0) {
      await prisma.momoTransaction.update({
        where: { orderId: data.orderId },
        data: {
          status: "SUCCESS",
          transId: data.transId,
          transDate: data.transDate ? new Date(data.transDate) : new Date(),
          responsePayload: JSON.stringify(data),
        },
      });

      // Update invoice status
      if (maHoaDon || transaction.maHoaDon) {
        await prisma.hoaDon.update({
          where: { maHoaDon: maHoaDon || transaction.maHoaDon },
          data: {
            trangThai: "DaThanhToan",
            phuongThucTT: "MoMo",
          },
        });

        console.log("[MoMo IPN] Invoice updated:", {
          maHoaDon: maHoaDon || transaction.maHoaDon,
        });
      }

      return {
        success: true,
        message: "Payment successful",
      };
    } else {
      // Handle failed payment
      await prisma.momoTransaction.update({
        where: { orderId: data.orderId },
        data: {
          status: "FAILED",
          responsePayload: JSON.stringify(data),
        },
      });

      console.log("[MoMo IPN] Payment failed:", data.message);
      return {
        success: false,
        message: `Payment failed: ${data.message}`,
      };
    }
  } catch (error) {
    console.error("[MoMo IPN] Unexpected error:", error);
    return {
      success: false,
      message: "Internal server error",
    };
  }
}

/**
 * Verify MoMo signature for IPN
 * Format: orderId={orderId}&transId={transId}&message={message}&amount={amount}&
 *         errorCode={errorCode}&payType={payType}&responseTime={responseTime}&
 *         extraData={extraData}&transDate={transDate}&accessKey={accessKey}&
 *         transStatus={transStatus}
 */
function verifyMoMoSignature(data: MoMoIpnRequest): boolean {
  try {
    // Build raw signature for IPN (based on MoMo v2 API)
    const rawSignature =
      `orderId=${data.orderId}&transId=${data.transId || ""}` +
      `&message=${data.message}&amount=${data.amount}` +
      `&errorCode=${data.errorCode}&responseTime=${data.responseTime || ""}` +
      `&extraData=${data.extraData || ""}&transDate=${data.transDate || ""}` +
      `&accessKey=${MOMO_ACCESS_KEY}`;

    const expectedSignature = signHmacSha256(rawSignature, MOMO_SECRET_KEY);

    const isValid = expectedSignature === data.signature;

    if (!isValid) {
      console.warn("[MoMo] Signature mismatch:", {
        expected: expectedSignature,
        actual: data.signature,
      });
    }

    return isValid;
  } catch (error) {
    console.error("[MoMo] Signature verification error:", error);
    return false;
  }
}

/**
 * Query payment status from MoMo
 */
export async function queryMoMoPaymentStatus(orderId: string): Promise<{
  status: string;
  transId?: string;
  errorMessage?: string;
}> {
  try {
    const requestId = generateRequestId();
    const queryEndpoint = MOMO_API_ENDPOINT.replace("/create", "/query");

    const rawSignature = `accessKey=${MOMO_ACCESS_KEY}&orderId=${orderId}&partnerCode=${MOMO_PARTNER_CODE}&requestId=${requestId}`;
    const signature = signHmacSha256(rawSignature, MOMO_SECRET_KEY);

    const response = await fetch(queryEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        partnerCode: MOMO_PARTNER_CODE,
        accessKey: MOMO_ACCESS_KEY,
        requestId,
        orderId,
        signature,
        lang: "vi",
      }),
    });

    if (!response.ok) {
      throw new AppError(response.status, "Failed to query payment status");
    }

    const result = (await response.json()) as MoMoStatusResult;

    if (result.errorCode === 0) {
      return {
        status: "COMPLETED",
        transId: result.transId,
      };
    } else if (result.errorCode === 1) {
      return {
        status: "PENDING",
      };
    } else {
      return {
        status: "FAILED",
        errorMessage: result.message,
      };
    }
  } catch (error) {
    console.error("[MoMo] Query status error:", error);
    throw new AppError(500, "Lỗi khi kiểm tra trạng thái thanh toán");
  }
}

/**
 * Store payment transaction record
 */
async function storePaymentTransaction(params: {
  orderId: string;
  maHoaDon: string;
  amount: number;
  requestId: string;
  status: string;
  extraData: string;
}): Promise<void> {
  try {
    await prisma.momoTransaction.upsert({
      where: { orderId: params.orderId },
      create: {
        orderId: params.orderId,
        maHoaDon: params.maHoaDon,
        amount: params.amount,
        requestId: params.requestId,
        status: params.status,
        extraData: params.extraData,
      },
      update: {
        status: params.status,
        requestId: params.requestId,
      },
    });
  } catch (error) {
    console.error("[MoMo] Error storing transaction:", error);
    // Non-fatal error - payment request already created
  }
}
