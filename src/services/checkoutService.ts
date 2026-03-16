// ============================================================
// src/services/checkoutService.ts
// Use Case: CHECK-OUT + THANH TOÁN PHẦN CÒN LẠI
//
// Pha 1 (chuẩn bị): tính tiền cuối cùng và upsert hóa đơn ở trạng thái chờ thanh toán.
// Pha 2 (thanh toán):
//   - Offline (CASH/POS): xác nhận thu tiền ngay, rồi đổi booking/room.
//   - MoMo QR: tạo QR và chờ IPN, khi IPN success mới đổi booking/room.
// ============================================================

import axios from "axios";
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../lib/db";
import { AppError } from "../middleware/errorHandler";
import { momoConfig } from "../config/momo";
import {
  signMomoPayload,
  verifyMomoPayloadSignature,
} from "../utils/momoSignature";

type CheckoutPaymentMethod = "CASH" | "POS" | "MOMO_QR";

const MOMO_CREATE_SIGNATURE_KEYS = [
  "accessKey",
  "amount",
  "extraData",
  "ipnUrl",
  "orderId",
  "orderInfo",
  "partnerCode",
  "redirectUrl",
  "requestId",
  "requestType",
] as const;

const MOMO_RESPONSE_SIGNATURE_KEYS = [
  "accessKey",
  "amount",
  "extraData",
  "message",
  "orderId",
  "orderInfo",
  "orderType",
  "partnerCode",
  "payType",
  "requestId",
  "responseTime",
  "resultCode",
  "transId",
] as const;

export interface SurchargeInput {
  tenDichVu: string;
  soTien: number;
  ghiChu?: string;
}

export interface CheckOutInput {
  maDatPhong?: string;
  bookingId?: string;
  idNhanVien: string;
  surcharges?: SurchargeInput[];
  actualCheckOutDate?: string | Date;
  // Giữ tương thích ngược với API cũ
  phuPhi?: number;
}

export interface CheckoutOfflineInput {
  invoiceId: string;
  paymentMethod: Extract<CheckoutPaymentMethod, "CASH" | "POS">;
  idNhanVien: string;
}

export interface CheckoutGenerateQrInput {
  invoiceId: string;
  idNhanVien: string;
}

type MomoPayloadRecord = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface CheckoutMomoIpnInput {
  [key: string]: unknown;
}

interface MomoCreateResponse {
  message: string;
  resultCode: number;
  payUrl?: string;
  qrCodeUrl?: string;
}

function toSingleValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0] ?? "") : "";
  }
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNumberSafe(value: Decimal | number): number {
  return Number(value instanceof Decimal ? value.toString() : value);
}

function getStayNights(checkInDate: Date, actualCheckOutDate: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(
    1,
    Math.ceil(
      (actualCheckOutDate.getTime() - checkInDate.getTime()) / msPerDay,
    ),
  );
}

function normalizeIncomingSurcharges(
  surcharges: SurchargeInput[] | undefined,
  phuPhi: number | undefined,
): SurchargeInput[] {
  const normalizedFromArray = (surcharges ?? [])
    .map((item) => ({
      tenDichVu: item.tenDichVu?.trim(),
      soTien: Number(item.soTien),
      ghiChu: item.ghiChu?.trim() || undefined,
    }))
    .filter((item) => Boolean(item.tenDichVu));

  for (const surcharge of normalizedFromArray) {
    if (!Number.isFinite(surcharge.soTien) || surcharge.soTien < 0) {
      throw new AppError(400, "Surcharge.soTien phải là số không âm.");
    }
  }

  const phuPhiLegacy = Number(phuPhi ?? 0);
  if (Number.isFinite(phuPhiLegacy) && phuPhiLegacy > 0) {
    normalizedFromArray.push({
      tenDichVu: "Phụ phí khác",
      soTien: phuPhiLegacy,
      ghiChu: undefined,
    });
  }

  return normalizedFromArray;
}

function mapToLegacyPhuongThucTT(method: CheckoutPaymentMethod): string {
  if (method === "CASH") return "TienMat";
  if (method === "POS") return "POS";
  return "MoMo";
}

function getCheckoutRedirectUrl(): string {
  const frontendBaseUrl =
    process.env.FRONTEND_BASE_URL ??
    process.env.BOOKING_RESULT_URL?.replace(/\/booking\/result$/, "") ??
    "http://localhost:3000";

  return (
    process.env.MOMO_CHECKOUT_REDIRECT_URL ??
    `${frontendBaseUrl}/admin/check-out`
  );
}

function getCheckoutIpnUrl(): string {
  if (process.env.MOMO_CHECKOUT_IPN_URL) {
    return process.env.MOMO_CHECKOUT_IPN_URL;
  }

  const backendPort = process.env.PORT ?? "3000";
  const backendBaseUrl =
    process.env.BACKEND_BASE_URL ?? `http://localhost:${backendPort}`;
  return `${backendBaseUrl}/api/checkout/momo-ipn`;
}

async function updateCheckoutSuccessState(params: {
  maHoaDon: string;
  idNhanVien: string;
  method: CheckoutPaymentMethod;
  paidAt?: Date;
}) {
  const paidAt = params.paidAt ?? new Date();

  return prisma.$transaction(async (tx) => {
    const hoaDon = await tx.hoaDon.findUnique({
      where: { maHoaDon: params.maHoaDon },
      include: {
        phieuDatPhong: {
          select: {
            maDatPhong: true,
            soPhong: true,
            trangThai: true,
            actualCheckOutDate: true,
          },
        },
      },
    });

    if (!hoaDon) {
      throw new AppError(404, `Không tìm thấy hóa đơn: ${params.maHoaDon}`);
    }

    const booking = hoaDon.phieuDatPhong;

    if (!["DaCheckIn", "DaCheckOut"].includes(booking.trangThai)) {
      throw new AppError(
        400,
        `Booking ${booking.maDatPhong} không ở trạng thái hợp lệ để tất toán (hiện tại: ${booking.trangThai}).`,
      );
    }

    const invoiceUpdated = await tx.hoaDon.update({
      where: { maHoaDon: params.maHoaDon },
      data: {
        idNhanVien: params.idNhanVien,
        paymentMethod: params.method,
        paymentStatus: "SUCCESS",
        trangThai: "DaThanhToan",
        phuongThucTT: mapToLegacyPhuongThucTT(params.method),
        ngayThanhToan: paidAt,
      },
      include: {
        phieuDatPhong: true,
      },
    });

    const bookingUpdated = await tx.phieuDatPhong.update({
      where: { maDatPhong: booking.maDatPhong },
      data: {
        trangThai: "DaCheckOut",
        actualCheckOutDate: booking.actualCheckOutDate ?? paidAt,
      },
    });

    const roomUpdated = await tx.phong.update({
      where: { soPhong: booking.soPhong },
      data: {
        tinhTrang: "CanDonDep",
      },
    });

    return {
      invoice: invoiceUpdated,
      booking: bookingUpdated,
      room: roomUpdated,
    };
  });
}

export async function thucHienCheckOut(input: CheckOutInput) {
  const { idNhanVien } = input;
  const bookingRef = input.bookingId ?? input.maDatPhong;

  if (!bookingRef?.trim()) {
    throw new AppError(400, "Thiếu booking id hoặc maDatPhong để check-out.");
  }

  const incomingSurcharges = normalizeIncomingSurcharges(
    input.surcharges,
    input.phuPhi,
  );

  const actualCheckOutDate = input.actualCheckOutDate
    ? new Date(input.actualCheckOutDate)
    : new Date();

  if (Number.isNaN(actualCheckOutDate.getTime())) {
    throw new AppError(400, "actualCheckOutDate không hợp lệ.");
  }

  // ── Bước 1: Tìm phiếu đặt phòng ─────────────────────────
  const phieu = await prisma.phieuDatPhong.findFirst({
    where: {
      OR: [{ maDatPhong: bookingRef }, { id: bookingRef }],
    },
    include: {
      phong: { select: { soPhong: true, giaPhong: true } },
      khachHang: { select: { hoTen: true, email: true } },
      hoaDon: true,
      surcharges: true,
    },
  });

  if (!phieu) {
    throw new AppError(404, `Không tìm thấy booking: ${bookingRef}`);
  }

  // ── Bước 2: Validate trạng thái ──────────────────────────
  if (phieu.trangThai === "DaCheckOut") {
    throw new AppError(400, "Đơn đặt phòng này đã check-out trước đó.");
  }

  if (phieu.trangThai === "DaHuy") {
    throw new AppError(
      400,
      "Đơn đặt phòng này đã được xử lý hoặc không hợp lệ",
    );
  }

  if (phieu.trangThai !== "DaCheckIn") {
    throw new AppError(
      400,
      `Không thể check-out. Phiếu đang ở trạng thái: "${phieu.trangThai}". Cần ở trạng thái "DaCheckIn".`,
    );
  }
  if (phieu.hoaDon?.trangThai === "DaHuy") {
    throw new AppError(400, "Phiếu đặt phòng này có hóa đơn đã hủy.");
  }

  // ── Bước 3: Kiểm tra nhân viên ───────────────────────────
  const nhanVien = await prisma.nhanVien.findUnique({
    where: { idNhanVien },
    select: { idNhanVien: true, hoTen: true },
  });
  if (!nhanVien) {
    throw new AppError(404, `Không tìm thấy nhân viên với ID: ${idNhanVien}`);
  }

  // ── Bước 4: Tính tiền ────────────────────────────────────
  const ngayDen = new Date(phieu.ngayDen);
  if (actualCheckOutDate < ngayDen) {
    throw new AppError(
      400,
      "actualCheckOutDate phải lớn hơn hoặc bằng ngày đến.",
    );
  }

  const soNgayO = getStayNights(ngayDen, actualCheckOutDate);

  const giaPhongPerNight = phieu.phong.giaPhong; // Decimal
  const tienPhong = toNumberSafe(giaPhongPerNight) * soNgayO;
  const tongPhuPhiDaLuu = phieu.surcharges.reduce(
    (sum, item) => sum + toNumberSafe(item.soTien),
    0,
  );
  const tongPhuPhiMoi = incomingSurcharges.reduce(
    (sum, item) => sum + item.soTien,
    0,
  );
  const tongPhuPhi = tongPhuPhiDaLuu + tongPhuPhiMoi;

  const tienCocDaThu = toNumberSafe(phieu.tienCoc);
  const tongThanhToanRaw = tienPhong + tongPhuPhi - tienCocDaThu;
  const soTienCon = Math.max(0, tongThanhToanRaw);
  const ghiChuCheckOut = [
    phieu.hoaDon?.ghiChu,
    `Chuẩn bị check-out lúc ${actualCheckOutDate.toISOString()}.`,
    `Khấu trừ tiền cọc: ${tienCocDaThu} VND.`,
  ]
    .filter(Boolean)
    .join(" | ");

  // ── Bước 5: Transaction ───────────────────────────────────
  const transactionResult = await prisma.$transaction(async (tx) => {
    if (incomingSurcharges.length > 0) {
      await tx.surcharge.createMany({
        data: incomingSurcharges.map((item) => ({
          maDatPhong: phieu.maDatPhong,
          tenDichVu: item.tenDichVu,
          soTien: new Decimal(item.soTien),
          ghiChu: item.ghiChu,
        })),
      });
    }

    const bookingSauTinhTien = await tx.phieuDatPhong.update({
      where: { maDatPhong: phieu.maDatPhong },
      data: {
        actualCheckOutDate,
      },
      include: {
        khachHang: { select: { hoTen: true, email: true } },
        phong: { select: { soPhong: true, giaPhong: true } },
      },
    });

    const hoaDonSauCapNhat = await tx.hoaDon.upsert({
      where: { maDatPhong: phieu.maDatPhong },
      update: {
        idNhanVien,
        tienPhong: new Decimal(tienPhong),
        tienDichVu: new Decimal(0),
        phuPhi: new Decimal(tongPhuPhi),
        tienCocDaTru: new Decimal(tienCocDaThu),
        tongTien: new Decimal(soTienCon),
        paymentMethod: null,
        paymentStatus: "PENDING",
        ngayThanhToan: actualCheckOutDate,
        trangThai: soTienCon === 0 ? "DaThanhToan" : "ChuaThanhToan",
        phuongThucTT: soTienCon === 0 ? "TienMat" : null,
        ghiChu: ghiChuCheckOut || undefined,
      },
      create: {
        maDatPhong: phieu.maDatPhong,
        idNhanVien,
        tienPhong: new Decimal(tienPhong),
        tienDichVu: new Decimal(0),
        phuPhi: new Decimal(tongPhuPhi),
        tienCocDaTru: new Decimal(tienCocDaThu),
        tongTien: new Decimal(soTienCon),
        paymentMethod: null,
        paymentStatus: "PENDING",
        ngayThanhToan: actualCheckOutDate,
        trangThai: soTienCon === 0 ? "DaThanhToan" : "ChuaThanhToan",
        phuongThucTT: soTienCon === 0 ? "TienMat" : null,
        ghiChu: ghiChuCheckOut || undefined,
      },
      include: {
        phieuDatPhong: {
          include: {
            khachHang: { select: { hoTen: true, email: true } },
            phong: {
              include: { loaiPhong: { select: { tenLoai: true } } },
            },
          },
        },
        nhanVien: { select: { hoTen: true } },
      },
    });

    const surcharges = await tx.surcharge.findMany({
      where: { maDatPhong: phieu.maDatPhong },
      orderBy: [{ createdAt: "asc" }],
    });

    return {
      booking: bookingSauTinhTien,
      hoaDon: hoaDonSauCapNhat,
      surcharges,
    };
  });

  return {
    success: true,
    message:
      soTienCon === 0
        ? "Đã chốt chi phí. Số tiền còn lại bằng 0, có thể xác nhận thanh toán offline để hoàn tất check-out."
        : "Đã chốt chi phí check-out. Vui lòng chọn phương thức thanh toán để hoàn tất.",
    data: {
      booking: transactionResult.booking,
      hoaDon: transactionResult.hoaDon,
      invoice: transactionResult.hoaDon,
      surcharges: transactionResult.surcharges,
      chiTietTinhTien: {
        soNgayO,
        giaPhongMoiDem: toNumberSafe(giaPhongPerNight),
        tienPhong,
        tongPhuPhi,
        tongPhuPhiDaLuu,
        tongPhuPhiMoi,
        tienCocDaTraTruoc: tienCocDaThu,
        tongThanhToanTheoCongThuc: tongThanhToanRaw,
        soTienConLai: soTienCon,
      },
    },
  };
}

export async function xacNhanThanhToanOffline(input: CheckoutOfflineInput) {
  const { invoiceId, paymentMethod, idNhanVien } = input;

  if (!invoiceId?.trim()) {
    throw new AppError(400, "invoiceId là bắt buộc.");
  }

  if (!["CASH", "POS"].includes(paymentMethod)) {
    throw new AppError(400, "paymentMethod chỉ chấp nhận CASH hoặc POS.");
  }

  const nhanVien = await prisma.nhanVien.findUnique({
    where: { idNhanVien },
    select: { idNhanVien: true },
  });

  if (!nhanVien) {
    throw new AppError(404, `Không tìm thấy nhân viên: ${idNhanVien}`);
  }

  const settlement = await updateCheckoutSuccessState({
    maHoaDon: invoiceId,
    idNhanVien,
    method: paymentMethod,
  });

  return {
    success: true,
    message: "Đã xác nhận thanh toán offline và hoàn tất check-out.",
    data: settlement,
  };
}

export async function taoQrThanhToanCheckout(input: CheckoutGenerateQrInput) {
  const { invoiceId, idNhanVien } = input;

  if (!invoiceId?.trim()) {
    throw new AppError(400, "invoiceId là bắt buộc.");
  }

  const hoaDon = await prisma.hoaDon.findUnique({
    where: { maHoaDon: invoiceId },
    include: {
      phieuDatPhong: {
        select: { maDatPhong: true, trangThai: true },
      },
    },
  });

  if (!hoaDon) {
    throw new AppError(404, `Không tìm thấy hóa đơn: ${invoiceId}`);
  }

  if (hoaDon.paymentStatus === "SUCCESS") {
    return {
      success: true,
      message: "Hóa đơn đã thanh toán thành công trước đó.",
      data: {
        invoiceId,
        paymentStatus: hoaDon.paymentStatus,
      },
    };
  }

  if (hoaDon.phieuDatPhong.trangThai !== "DaCheckIn") {
    throw new AppError(
      400,
      `Booking ${hoaDon.phieuDatPhong.maDatPhong} chưa ở trạng thái check-in để thanh toán check-out.`,
    );
  }

  const amount = Math.max(0, toNumberSafe(hoaDon.tongTien));
  if (amount < 1000) {
    throw new AppError(
      400,
      "Số tiền thanh toán online tối thiểu là 1.000 VNĐ. Hãy xác nhận offline cho trường hợp còn lại nhỏ hơn mức này.",
    );
  }

  const orderId = `CO_${invoiceId}_${Date.now()}`;
  const requestId = `REQ_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const orderInfo = `Thanh toan checkout ${invoiceId}`;
  const ipnUrl = getCheckoutIpnUrl();
  const redirectUrl = getCheckoutRedirectUrl();
  const extraData = Buffer.from(
    JSON.stringify({
      invoiceId,
      maDatPhong: hoaDon.maDatPhong,
      source: "checkout",
    }),
    "utf8",
  ).toString("base64");

  const signaturePayload: MomoPayloadRecord = {
    accessKey: momoConfig.accessKey,
    amount,
    extraData,
    ipnUrl,
    orderId,
    orderInfo,
    partnerCode: momoConfig.partnerCode,
    redirectUrl,
    requestId,
    requestType: "captureWallet",
  };

  const signature = signMomoPayload(
    signaturePayload,
    MOMO_CREATE_SIGNATURE_KEYS,
    momoConfig.secretKey,
  );

  const momoPayload = {
    partnerCode: momoConfig.partnerCode,
    accessKey: momoConfig.accessKey,
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    extraData,
    requestType: "captureWallet",
    signature,
    lang: "vi",
    autoCapture: true,
  };

  const { data: momoResponse } = await axios.post<MomoCreateResponse>(
    momoConfig.endpoint,
    momoPayload,
    {
      timeout: 15000,
      headers: { "Content-Type": "application/json" },
    },
  );

  if (toNumber(momoResponse.resultCode, 1) !== 0 || !momoResponse.payUrl) {
    throw new AppError(
      400,
      `MoMo từ chối giao dịch checkout: ${momoResponse.message || "Không rõ lý do"}`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.hoaDon.update({
      where: { maHoaDon: invoiceId },
      data: {
        idNhanVien,
        paymentMethod: "MOMO_QR",
        paymentStatus: "PENDING",
      },
    });

    await tx.momoTransaction.upsert({
      where: { maHoaDon: invoiceId },
      create: {
        orderId,
        maHoaDon: invoiceId,
        amount: new Decimal(amount),
        requestId,
        status: "PENDING",
        extraData,
      },
      update: {
        orderId,
        amount: new Decimal(amount),
        requestId,
        status: "PENDING",
        extraData,
        responsePayload: null,
        transId: null,
        transDate: null,
      },
    });
  });

  return {
    success: true,
    message: "Đã tạo mã QR thanh toán MoMo cho check-out.",
    data: {
      invoiceId,
      orderId,
      requestId,
      qrCodeUrl: momoResponse.qrCodeUrl ?? momoResponse.payUrl,
      payUrl: momoResponse.payUrl,
      paymentStatus: "PENDING",
    },
  };
}

export async function xuLyMomoIpnCheckout(payload: CheckoutMomoIpnInput) {
  const normalized: MomoPayloadRecord = {
    partnerCode: toSingleValue(payload.partnerCode),
    orderId: toSingleValue(payload.orderId),
    requestId: toSingleValue(payload.requestId),
    amount: toSingleValue(payload.amount),
    orderInfo: toSingleValue(payload.orderInfo),
    orderType: toSingleValue(payload.orderType),
    transId: toSingleValue(payload.transId),
    resultCode: toSingleValue(payload.resultCode),
    message: toSingleValue(payload.message),
    payType: toSingleValue(payload.payType),
    responseTime: toSingleValue(payload.responseTime),
    extraData: toSingleValue(payload.extraData),
    accessKey: momoConfig.accessKey,
  };

  const signature = toSingleValue(payload.signature);
  if (!signature) {
    throw new AppError(400, "Thiếu chữ ký signature từ MoMo IPN checkout.");
  }

  const validSignature = verifyMomoPayloadSignature(
    normalized,
    MOMO_RESPONSE_SIGNATURE_KEYS,
    momoConfig.secretKey,
    signature,
  );

  if (!validSignature) {
    throw new AppError(400, "Chữ ký IPN checkout không hợp lệ.");
  }

  const orderId = toSingleValue(payload.orderId);
  if (!orderId) {
    throw new AppError(400, "Thiếu orderId trong IPN checkout.");
  }

  const transaction = await prisma.momoTransaction.findUnique({
    where: { orderId },
  });

  if (!transaction) {
    throw new AppError(404, `Không tìm thấy giao dịch với orderId: ${orderId}`);
  }

  const resultCode = toNumber(payload.resultCode, 1);
  const transDate = toSingleValue(payload.transDate);
  const paidAt = transDate ? new Date(Number(transDate)) : new Date();

  if (resultCode !== 0) {
    await prisma.momoTransaction.update({
      where: { orderId },
      data: {
        status: "FAILED",
        responsePayload: JSON.stringify(payload),
      },
    });

    return {
      success: false,
      message: `MoMo trả về thất bại: ${toSingleValue(payload.message) || "Unknown"}`,
      data: {
        invoiceId: transaction.maHoaDon,
        paymentStatus: "PENDING",
      },
    };
  }

  await prisma.momoTransaction.update({
    where: { orderId },
    data: {
      status: "SUCCESS",
      transId: toSingleValue(payload.transId) || null,
      transDate: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt,
      responsePayload: JSON.stringify(payload),
    },
  });

  const invoice = await prisma.hoaDon.findUnique({
    where: { maHoaDon: transaction.maHoaDon },
    select: {
      maHoaDon: true,
      idNhanVien: true,
      paymentStatus: true,
    },
  });

  if (!invoice) {
    throw new AppError(
      404,
      `Không tìm thấy hóa đơn cho giao dịch: ${transaction.maHoaDon}`,
    );
  }

  if (invoice.paymentStatus === "SUCCESS") {
    return {
      success: true,
      message: "MoMo IPN checkout đã xử lý thành công.",
      data: {
        invoiceId: invoice.maHoaDon,
        paymentStatus: invoice.paymentStatus,
      },
    };
  }

  const result = await updateCheckoutSuccessState({
    maHoaDon: invoice.maHoaDon,
    idNhanVien: invoice.idNhanVien,
    method: "MOMO_QR",
    paidAt,
  });

  return {
    success: true,
    message: "MoMo IPN checkout đã xử lý thành công.",
    data: {
      invoiceId: result.invoice.maHoaDon,
      paymentStatus: result.invoice.paymentStatus,
    },
  };
}

export async function layTrangThaiThanhToanCheckout(invoiceId: string) {
  if (!invoiceId?.trim()) {
    throw new AppError(400, "invoiceId là bắt buộc.");
  }

  const invoice = await prisma.hoaDon.findUnique({
    where: { maHoaDon: invoiceId },
    select: {
      maHoaDon: true,
      paymentStatus: true,
      paymentMethod: true,
      trangThai: true,
      tongTien: true,
      updatedAt: true,
      phieuDatPhong: {
        select: {
          maDatPhong: true,
          trangThai: true,
          soPhong: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new AppError(404, `Không tìm thấy hóa đơn: ${invoiceId}`);
  }

  return {
    success: true,
    data: {
      invoiceId: invoice.maHoaDon,
      paymentStatus: invoice.paymentStatus,
      paymentMethod: invoice.paymentMethod,
      invoiceStatus: invoice.trangThai,
      amount: toNumberSafe(invoice.tongTien),
      updatedAt: invoice.updatedAt,
      booking: invoice.phieuDatPhong,
    },
  };
}
