const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const BASE_URL =
  process.env.E2E_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
const MOMO_ACCESS_KEY = process.env.MOMO_ACCESS_KEY || "F8BBA842ECF85";
const MOMO_SECRET_KEY =
  process.env.MOMO_SECRET_KEY || "K951B6PE1waDMi640xX08PD3vg6EkVlz";
const MOMO_PARTNER_CODE = process.env.MOMO_PARTNER_CODE || "MOMO";

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
];

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function signPayload(payload, orderedKeys, secretKey) {
  const raw = orderedKeys
    .map((key) => `${key}=${payload[key] ?? ""}`)
    .join("&");
  return crypto.createHmac("sha256", secretKey).update(raw).digest("hex");
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, ok: response.ok, data };
}

async function runCase({ roomId, resultCode, caseName }) {
  const now = Date.now();
  const checkInDate = addDays(7);
  const checkOutDate = addDays(9);
  const totalPrice = 2200000;

  const createPayload = {
    roomId,
    checkInDate,
    checkOutDate,
    totalPrice,
    guestName: `E2E ${caseName}`,
    guestPhone: `09${String(now).slice(-8)}`,
    guestEmail: `e2e.${caseName.toLowerCase()}.${now}@example.com`,
    customer: {
      hoTen: `E2E ${caseName}`,
      sdt: `09${String(now).slice(-8)}`,
      email: `e2e.${caseName.toLowerCase()}.${now}@example.com`,
      cccd_passport: `${now}${Math.floor(Math.random() * 1000)}`,
      diaChi: "TP.HCM",
    },
    note: `Auto E2E ${caseName}`,
  };

  const createRes = await postJson(
    `${BASE_URL}/api/bookings/create`,
    createPayload,
  );
  if (!createRes.ok || !createRes.data?.data?.orderId) {
    throw new Error(
      `[${caseName}] create booking failed: status=${createRes.status}, body=${JSON.stringify(createRes.data)}`,
    );
  }

  const created = createRes.data.data;
  const bookingOrderId = created.orderId;

  const before = await prisma.phieuDatPhong.findFirst({
    where: { id: bookingOrderId },
    select: {
      maDatPhong: true,
      soPhong: true,
      id: true,
      status: true,
      trangThai: true,
      depositAmount: true,
      momoTransId: true,
    },
  });

  const nights = 2;
  const orderInfo = `Dat coc phong ${roomId} (${nights} dem)`;
  const depositAmount = Math.round(totalPrice * 0.3);
  const extraData = Buffer.from(
    JSON.stringify({
      roomId,
      checkInDate,
      checkOutDate,
      totalPrice,
      depositAmount,
      guestName: createPayload.guestName,
      guestPhone: createPayload.guestPhone,
      guestEmail: createPayload.guestEmail,
      customer: createPayload.customer,
      note: createPayload.note,
    }),
    "utf8",
  ).toString("base64");
  const transId = `${Math.floor(1000000000 + Math.random() * 8999999999)}`;

  const ipnForSignature = {
    accessKey: MOMO_ACCESS_KEY,
    amount: depositAmount,
    extraData,
    message:
      resultCode === 0 ? "Successful." : "Transaction denied by test case.",
    orderId: created.orderId,
    orderInfo,
    orderType: "momo_wallet",
    partnerCode: MOMO_PARTNER_CODE,
    payType: "qr",
    requestId: created.requestId,
    responseTime: `${Date.now()}`,
    resultCode,
    transId,
  };

  const signature = signPayload(
    ipnForSignature,
    MOMO_RESPONSE_SIGNATURE_KEYS,
    MOMO_SECRET_KEY,
  );

  const ipnPayload = {
    partnerCode: ipnForSignature.partnerCode,
    orderId: ipnForSignature.orderId,
    requestId: ipnForSignature.requestId,
    amount: ipnForSignature.amount,
    orderInfo: ipnForSignature.orderInfo,
    orderType: ipnForSignature.orderType,
    transId: ipnForSignature.transId,
    resultCode: ipnForSignature.resultCode,
    message: ipnForSignature.message,
    payType: ipnForSignature.payType,
    responseTime: ipnForSignature.responseTime,
    extraData: ipnForSignature.extraData,
    signature,
  };

  const ipnResponse = await fetch(`${BASE_URL}/api/bookings/momo-ipn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ipnPayload),
  });

  const callbackUrl = new URL(`${BASE_URL}/api/bookings/momo-callback`);
  Object.entries(ipnPayload).forEach(([k, v]) =>
    callbackUrl.searchParams.set(k, String(v)),
  );
  const callbackRes = await fetch(callbackUrl, { redirect: "manual" });

  const after = await prisma.phieuDatPhong.findFirst({
    where: { id: bookingOrderId },
    select: {
      maDatPhong: true,
      soPhong: true,
      id: true,
      status: true,
      trangThai: true,
      depositAmount: true,
      momoTransId: true,
      updatedAt: true,
    },
  });

  const roomAfter = await prisma.phong.findUnique({
    where: { soPhong: roomId },
    select: { soPhong: true, tinhTrang: true, updatedAt: true },
  });

  return {
    caseName,
    roomId,
    created: {
      bookingOrderId,
      orderId: created.orderId,
      requestId: created.requestId,
      payUrlSample: String(created.payUrl || "").slice(0, 80),
      depositAmount,
      totalPrice: created.totalPrice,
      createStatus: createRes.status,
    },
    ipn: {
      status: ipnResponse.status,
      expectedStatus: 204,
      resultCode,
      transId,
    },
    callback: {
      status: callbackRes.status,
      location: callbackRes.headers.get("location"),
    },
    dbBeforeIpn: before,
    dbAfterIpn: after,
    roomAfter,
  };
}

function assertCase(result) {
  if (result.ipn.status !== 204) {
    throw new Error(
      `[${result.caseName}] expected IPN 204, got ${result.ipn.status}`,
    );
  }
  if (result.callback.status !== 302) {
    throw new Error(
      `[${result.caseName}] expected callback 302, got ${result.callback.status}`,
    );
  }
  if (result.caseName === "SUCCESS") {
    if (!result.dbAfterIpn) {
      throw new Error(
        "[SUCCESS] booking was not created after successful payment",
      );
    }
    if (result.dbAfterIpn?.status !== "DEPOSIT_PAID") {
      throw new Error("[SUCCESS] booking status did not become DEPOSIT_PAID");
    }
    if (result.dbAfterIpn?.trangThai !== "DaXacNhan") {
      throw new Error("[SUCCESS] trangThai did not become DaXacNhan");
    }
  }
  if (result.caseName === "FAILED") {
    if (result.dbAfterIpn) {
      throw new Error(
        "[FAILED] booking should not be created for failed payment",
      );
    }
  }
}

async function main() {
  const rooms = await prisma.phong.findMany({
    where: { tinhTrang: "Trong" },
    select: { soPhong: true },
    orderBy: { soPhong: "asc" },
    take: 2,
  });

  if (rooms.length < 2) {
    throw new Error("Khong du phong trong de chay 2 test cases.");
  }

  const successCase = await runCase({
    roomId: rooms[0].soPhong,
    resultCode: 0,
    caseName: "SUCCESS",
  });

  const failedCase = await runCase({
    roomId: rooms[1].soPhong,
    resultCode: 1006,
    caseName: "FAILED",
  });

  assertCase(successCase);
  assertCase(failedCase);

  console.log(
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        timestamp: new Date().toISOString(),
        successCase,
        failedCase,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("E2E_ERROR", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
