// src/services/bookingMomoService.ts

import axios from "axios";
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../lib/db";
import { AppError } from "../middleware/errorHandler";
import { momoConfig } from "../config/momo";
import {
  signMomoPayload,
  verifyMomoPayloadSignature,
} from "../utils/momoSignature";
import { upsertKhachHang } from "./customerService";

const DEPOSIT_RATE = 0.3;
const MIN_MOMO_AMOUNT = 1000;

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

export interface BookingCustomerInput {
  hoTen: string;
  sdt: string;
  email: string;
  cccd_passport?: string;
  diaChi?: string;
}

export interface BookingGuestInput {
  guestName: string;
  guestPhone: string;
  guestEmail: string;
}

export interface CreateBookingWithMomoInput {
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  customer?: BookingCustomerInput;
  userId?: string | null;
  paymentMethod?: BookingPaymentMethod;
  note?: string;
}

export type BookingPaymentMethod = "QR" | "CARD";
type MomoRequestType = "captureWallet" | "payWithMethod";

export interface CreateBookingWithMomoResult {
  payUrl: string;
  orderId: string;
  requestId: string;
  totalPrice: number;
  depositAmount: number;
  paymentMethod: BookingPaymentMethod;
  requestType: MomoRequestType;
}

interface MomoCreateResponse {
  partnerCode?: string;
  orderId?: string;
  requestId?: string;
  amount?: number;
  responseTime?: number;
  message: string;
  resultCode: number;
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
}

type MomoPayloadRecord = Record<
  string,
  string | number | boolean | null | undefined
>;

interface MomoBookingExtraData {
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  depositAmount: number;
  userId?: string | null;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  paymentMethod?: BookingPaymentMethod;
  customer: Required<BookingCustomerInput>;
  note?: string;
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

function normalizeCurrency(value: number): number {
  return Math.round(value);
}

function getNights(checkInDate: Date, checkOutDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(
    1,
    Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / msPerDay),
  );
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function assertValidGuestContact(guest: BookingGuestInput): void {
  if (!guest.guestName?.trim()) {
    throw new AppError(400, "guestName là bắt buộc.");
  }
  if (!guest.guestPhone?.trim()) {
    throw new AppError(400, "guestPhone là bắt buộc.");
  }

  const email = guest.guestEmail?.trim();
  if (!email) {
    throw new AppError(400, "guestEmail là bắt buộc.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError(400, "guestEmail không hợp lệ.");
  }
}

function buildCustomerProfile(input: {
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  customer?: BookingCustomerInput;
}): Required<BookingCustomerInput> {
  const fallbackId = `GUEST-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

  return {
    hoTen: input.guestName.trim(),
    sdt: input.guestPhone.trim(),
    email: input.guestEmail.trim().toLowerCase(),
    cccd_passport: normalizeText(input.customer?.cccd_passport) || fallbackId,
    diaChi: normalizeText(input.customer?.diaChi) || "Khach vang lai",
  };
}

function getGuestFromExtraData(
  parsed: Partial<MomoBookingExtraData>,
): BookingGuestInput {
  const guestName =
    normalizeText(parsed.guestName) || normalizeText(parsed.customer?.hoTen);
  const guestPhone =
    normalizeText(parsed.guestPhone) || normalizeText(parsed.customer?.sdt);
  const guestEmail =
    normalizeText(parsed.guestEmail) || normalizeText(parsed.customer?.email);

  return { guestName, guestPhone, guestEmail };
}

function normalizeUserId(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizePaymentMethod(
  value: unknown,
): BookingPaymentMethod | undefined {
  if (value === "CARD" || value === "QR") {
    return value;
  }

  return undefined;
}

function decodeExtraData(extraData: string): MomoBookingExtraData {
  if (!extraData) {
    throw new AppError(400, "Thiếu extraData từ MoMo.");
  }

  try {
    const decoded = Buffer.from(extraData, "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as Partial<MomoBookingExtraData>;

    if (!parsed.roomId?.trim()) {
      throw new AppError(400, "extraData.roomId không hợp lệ.");
    }

    if (!parsed.checkInDate || !parsed.checkOutDate) {
      throw new AppError(400, "extraData thiếu checkInDate/checkOutDate.");
    }

    const totalPrice = Number(parsed.totalPrice);
    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      throw new AppError(400, "extraData.totalPrice không hợp lệ.");
    }

    const depositAmount = Number(parsed.depositAmount);
    if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
      throw new AppError(400, "extraData.depositAmount không hợp lệ.");
    }

    const guest = getGuestFromExtraData(parsed);
    assertValidGuestContact(guest);

    return {
      roomId: parsed.roomId,
      checkInDate: parsed.checkInDate,
      checkOutDate: parsed.checkOutDate,
      totalPrice,
      depositAmount,
      userId: normalizeUserId(parsed.userId),
      guestName: guest.guestName,
      guestPhone: guest.guestPhone,
      guestEmail: guest.guestEmail,
      paymentMethod: normalizePaymentMethod(parsed.paymentMethod),
      customer: buildCustomerProfile({
        guestName: guest.guestName,
        guestPhone: guest.guestPhone,
        guestEmail: guest.guestEmail,
        customer: parsed.customer,
      }),
      note: normalizeText(parsed.note) || undefined,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(400, "Không giải mã được extraData từ MoMo.");
  }
}

function buildOrderInfo(roomId: string, nights: number): string {
  return `Dat coc phong ${roomId} (${nights} dem)`;
}

function resolveRequestType(
  paymentMethod: BookingPaymentMethod,
): MomoRequestType {
  if (paymentMethod === "CARD") {
    return "payWithMethod";
  }

  return "captureWallet";
}

async function createBookingAfterPaid(
  payload: MomoPayloadRecord,
): Promise<string | null> {
  const resultCode = toNumber(payload.resultCode, 1);
  if (resultCode !== 0) {
    return null;
  }

  const orderId = toSingleValue(payload.orderId);
  if (!orderId) {
    throw new AppError(400, "Thiếu orderId từ MoMo.");
  }

  const existed = await prisma.phieuDatPhong.findFirst({
    where: { id: orderId },
    select: { maDatPhong: true },
  });

  if (existed) {
    return existed.maDatPhong;
  }

  const extraData = decodeExtraData(toSingleValue(payload.extraData));
  const checkIn = new Date(extraData.checkInDate);
  const checkOut = new Date(extraData.checkOutDate);

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    throw new AppError(
      400,
      "Ngày nhận/trả phòng trong extraData không hợp lệ.",
    );
  }

  if (checkOut <= checkIn) {
    throw new AppError(400, "Ngày trả phòng phải sau ngày nhận phòng.");
  }

  const momoAmount = normalizeCurrency(toNumber(payload.amount, 0));
  const expectedDeposit = normalizeCurrency(extraData.depositAmount);
  if (momoAmount !== expectedDeposit) {
    throw new AppError(
      400,
      `Số tiền cọc không khớp. expected=${expectedDeposit}, received=${momoAmount}`,
    );
  }

  const customerResult = await upsertKhachHang(extraData.customer);

  const booking = await prisma.$transaction(async (tx) => {
    const room = await tx.phong.findUnique({
      where: { soPhong: extraData.roomId },
      select: { soPhong: true, tinhTrang: true },
    });

    if (!room) {
      throw new AppError(404, `Không tìm thấy phòng: ${extraData.roomId}`);
    }

    if (room.tinhTrang !== "Trong") {
      throw new AppError(
        409,
        `Phòng ${extraData.roomId} không còn trống để ghi nhận đặt phòng sau thanh toán.`,
      );
    }

    const created = await tx.phieuDatPhong.create({
      data: {
        id: orderId,
        userId: extraData.userId,
        guestName: extraData.guestName,
        guestPhone: extraData.guestPhone,
        guestEmail: extraData.guestEmail,
        idKhachHang: customerResult.data.idKhachHang,
        soPhong: extraData.roomId,
        ngayDen: checkIn,
        ngayDi: checkOut,
        tienCoc: new Decimal(expectedDeposit),
        trangThai: "DaXacNhan",
        ghiChu:
          extraData.note?.trim() ||
          `Đặt cọc MoMo thành công. orderId=${orderId}, transId=${toSingleValue(payload.transId) || "N/A"}`,
        roomId: extraData.roomId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        totalPrice: new Decimal(normalizeCurrency(extraData.totalPrice)),
        depositAmount: new Decimal(expectedDeposit),
        status: "DEPOSIT_PAID",
        momoTransId: toSingleValue(payload.transId) || null,
      },
      select: { maDatPhong: true },
    });

    await tx.phong.update({
      where: { soPhong: extraData.roomId },
      data: { tinhTrang: "DaDuocDat" },
    });

    return created;
  });

  try {
    const { EmailService } = await import("./emailService");

    // extraData và checkIn/checkOut đã được lấy và parse ở phía trên của hàm này
    const dataEmail = {
      customerName: extraData.guestName,
      bookingCode: booking.maDatPhong,
      roomDetail: `Phòng ${extraData.roomId}`,
      checkinDate: checkIn.toLocaleDateString("vi-VN"),
      checkoutDate: checkOut.toLocaleDateString("vi-VN"),
      totalAmount: normalizeCurrency(extraData.totalPrice).toLocaleString(
        "vi-VN",
      ),
    };

    await EmailService.sendBookingConfirmation(extraData.guestEmail, dataEmail);
    console.log(
      `[MoMo Service] Đã gửi email xác nhận đặt phòng cho: ${extraData.guestEmail}`,
    );
  } catch (err) {
    console.error(
      "[MoMo Service] Lỗi gửi email xác nhận sau khi thanh toán:",
      err,
    );
  }

  return booking.maDatPhong;
}

export async function createBookingWithMomoPayment(
  input: CreateBookingWithMomoInput,
): Promise<CreateBookingWithMomoResult> {
  const checkIn = new Date(input.checkInDate);
  const checkOut = new Date(input.checkOutDate);

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    throw new AppError(400, "checkInDate hoặc checkOutDate không hợp lệ.");
  }

  if (checkOut <= checkIn) {
    throw new AppError(400, "checkOutDate phải lớn hơn checkInDate.");
  }

  const totalPrice = normalizeCurrency(input.totalPrice);
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    throw new AppError(400, "totalPrice phải là số dương.");
  }

  const depositAmount = normalizeCurrency(totalPrice * DEPOSIT_RATE);
  if (depositAmount < MIN_MOMO_AMOUNT) {
    throw new AppError(
      400,
      `depositAmount phải >= ${MIN_MOMO_AMOUNT.toLocaleString("vi-VN")} VNĐ để thanh toán MoMo.`,
    );
  }

  try {
    const guest: BookingGuestInput = {
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      guestEmail: input.guestEmail,
    };

    assertValidGuestContact(guest);
    const customerProfile = buildCustomerProfile({
      guestName: guest.guestName,
      guestPhone: guest.guestPhone,
      guestEmail: guest.guestEmail,
      customer: input.customer,
    });

    const paymentMethod: BookingPaymentMethod = input.paymentMethod ?? "QR";
    const requestType = resolveRequestType(paymentMethod);

    const room = await prisma.phong.findUnique({
      where: { soPhong: input.roomId },
      select: { soPhong: true, tinhTrang: true },
    });

    if (!room) {
      throw new AppError(404, `Không tìm thấy phòng: ${input.roomId}`);
    }

    if (room.tinhTrang !== "Trong") {
      throw new AppError(
        409,
        `Phòng ${input.roomId} hiện không khả dụng (trạng thái: ${room.tinhTrang}).`,
      );
    }

    const orderId = `BOOKING_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    const requestId = `${orderId}_${Math.floor(Math.random() * 1000)}`;
    const orderInfo = buildOrderInfo(
      input.roomId,
      getNights(checkIn, checkOut),
    );

    const extraDataPayload: MomoBookingExtraData = {
      roomId: input.roomId,
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      totalPrice,
      depositAmount,
      userId: input.userId ?? null,
      guestName: guest.guestName.trim(),
      guestPhone: guest.guestPhone.trim(),
      guestEmail: guest.guestEmail.trim().toLowerCase(),
      paymentMethod,
      customer: customerProfile,
      note: input.note,
    };

    const extraData = Buffer.from(
      JSON.stringify(extraDataPayload),
      "utf8",
    ).toString("base64");

    const signatureBasePayload: MomoPayloadRecord = {
      accessKey: momoConfig.accessKey,
      amount: depositAmount,
      extraData,
      ipnUrl: momoConfig.ipnUrl,
      orderId,
      orderInfo,
      partnerCode: momoConfig.partnerCode,
      redirectUrl: momoConfig.redirectUrl,
      requestId,
      requestType,
    };

    const signature = signMomoPayload(
      signatureBasePayload,
      MOMO_CREATE_SIGNATURE_KEYS,
      momoConfig.secretKey,
    );

    const momoPayload = {
      partnerCode: momoConfig.partnerCode,
      accessKey: momoConfig.accessKey,
      requestId,
      amount: depositAmount,
      orderId,
      orderInfo,
      redirectUrl: momoConfig.redirectUrl,
      ipnUrl: momoConfig.ipnUrl,
      extraData,
      requestType,
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
        `MoMo từ chối giao dịch: ${momoResponse.message || "Không rõ lý do"}`,
      );
    }

    return {
      payUrl: momoResponse.payUrl,
      orderId,
      requestId,
      totalPrice,
      depositAmount,
      paymentMethod,
      requestType,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const momoMessage =
        (error.response?.data as { message?: string } | undefined)?.message ||
        error.message;
      throw new AppError(502, `Không thể kết nối MoMo: ${momoMessage}`);
    }

    throw new AppError(500, "Lỗi không xác định khi tạo booking MoMo.");
  }
}

export async function processBookingMomoIpn(
  payload: Record<string, unknown>,
): Promise<void> {
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
    throw new AppError(400, "Thiếu chữ ký signature từ MoMo IPN.");
  }

  const isValidSignature = verifyMomoPayloadSignature(
    normalized,
    MOMO_RESPONSE_SIGNATURE_KEYS,
    momoConfig.secretKey,
    signature,
  );

  if (!isValidSignature) {
    throw new AppError(400, "Chữ ký IPN không hợp lệ.");
  }

  const resultCode = toNumber(payload.resultCode, 1);

  if (resultCode !== 0) {
    // Payment failed/cancelled: do not create booking records.
    return;
  }

  await createBookingAfterPaid(normalized);
}

export async function buildBookingMomoCallbackRedirect(
  query: Record<string, unknown>,
): Promise<string> {
  const normalized: MomoPayloadRecord = {
    partnerCode: toSingleValue(query.partnerCode),
    orderId: toSingleValue(query.orderId),
    requestId: toSingleValue(query.requestId),
    amount: toSingleValue(query.amount),
    orderInfo: toSingleValue(query.orderInfo),
    orderType: toSingleValue(query.orderType),
    transId: toSingleValue(query.transId),
    resultCode: toSingleValue(query.resultCode),
    message: toSingleValue(query.message),
    payType: toSingleValue(query.payType),
    responseTime: toSingleValue(query.responseTime),
    extraData: toSingleValue(query.extraData),
    accessKey: momoConfig.accessKey,
  };

  const signature = toSingleValue(query.signature);
  const signatureValid =
    !!signature &&
    verifyMomoPayloadSignature(
      normalized,
      MOMO_RESPONSE_SIGNATURE_KEYS,
      momoConfig.secretKey,
      signature,
    );

  const resultCode = toNumber(query.resultCode, 1);
  let bookingId: string | null = null;
  let status = "failed";
  let callbackMessage = toSingleValue(query.message);

  if (signatureValid && resultCode === 0) {
    try {
      bookingId = await createBookingAfterPaid(normalized);
      status = bookingId ? "success" : "failed";

      if (!bookingId) {
        callbackMessage =
          "Thanh toán thành công nhưng chưa thể ghi nhận đặt phòng. Vui lòng liên hệ hỗ trợ.";
      }
    } catch (error) {
      console.error("[Booking MoMo Callback] Create booking error:", error);
      status = "failed";
      callbackMessage =
        "Thanh toán thành công nhưng không thể ghi nhận đặt phòng. Vui lòng liên hệ hỗ trợ.";
    }
  }

  const redirectUrl = new URL(momoConfig.frontendResultUrl);

  redirectUrl.searchParams.set("status", status);
  redirectUrl.searchParams.set("resultCode", String(resultCode));
  redirectUrl.searchParams.set("signatureValid", String(signatureValid));
  redirectUrl.searchParams.set("message", callbackMessage);
  redirectUrl.searchParams.set("orderId", toSingleValue(query.orderId));
  redirectUrl.searchParams.set("transId", toSingleValue(query.transId));

  if (bookingId) {
    redirectUrl.searchParams.set("bookingId", bookingId);
  }

  return redirectUrl.toString();
}
