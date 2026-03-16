// src/utils/momoSignature.ts

import crypto from "crypto";

type MomoPrimitive = string | number | boolean | null | undefined;

function normalizeValue(value: MomoPrimitive): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function buildMomoRawSignature(
  payload: Record<string, MomoPrimitive>,
  orderedKeys: readonly string[],
): string {
  return orderedKeys
    .map((key) => `${key}=${normalizeValue(payload[key])}`)
    .join("&");
}

export function signRawSignature(
  rawSignature: string,
  secretKey: string,
): string {
  return crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");
}

export function signMomoPayload(
  payload: Record<string, MomoPrimitive>,
  orderedKeys: readonly string[],
  secretKey: string,
): string {
  const rawSignature = buildMomoRawSignature(payload, orderedKeys);
  return signRawSignature(rawSignature, secretKey);
}

export function verifyMomoPayloadSignature(
  payload: Record<string, MomoPrimitive>,
  orderedKeys: readonly string[],
  secretKey: string,
  providedSignature: string,
): boolean {
  const expected = signMomoPayload(payload, orderedKeys, secretKey);
  const actualBuffer = Buffer.from(providedSignature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}
