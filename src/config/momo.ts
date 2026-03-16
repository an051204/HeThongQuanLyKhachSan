// src/config/momo.ts
// Centralized MoMo Sandbox configuration for booking deposit flow.

export interface MomoSandboxConfig {
  endpoint: string;
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  requestType: "captureWallet";
  redirectUrl: string;
  ipnUrl: string;
  frontendResultUrl: string;
}

const backendPort = process.env.PORT ?? "3000";
const backendBaseUrl =
  process.env.BACKEND_BASE_URL ?? `http://localhost:${backendPort}`;
const frontendBaseUrl =
  process.env.FRONTEND_BASE_URL ?? "http://localhost:3000";

export const momoConfig: MomoSandboxConfig = {
  endpoint:
    process.env.MOMO_ENDPOINT ??
    process.env.MOMO_API_ENDPOINT ??
    "https://test-payment.momo.vn/v2/gateway/api/create",
  partnerCode: process.env.MOMO_PARTNER_CODE ?? "MOMO",
  accessKey: process.env.MOMO_ACCESS_KEY ?? "F8BBA842ECF85",
  secretKey: process.env.MOMO_SECRET_KEY ?? "K951B6PE1waDMi640xX08PD3vg6EkVlz",
  requestType: "captureWallet",
  redirectUrl:
    process.env.MOMO_BOOKING_REDIRECT_URL ??
    `${backendBaseUrl}/api/bookings/momo-callback`,
  ipnUrl:
    process.env.MOMO_BOOKING_IPN_URL ??
    `${backendBaseUrl}/api/bookings/momo-ipn`,
  frontendResultUrl:
    process.env.BOOKING_RESULT_URL ?? `${frontendBaseUrl}/booking/result`,
};
