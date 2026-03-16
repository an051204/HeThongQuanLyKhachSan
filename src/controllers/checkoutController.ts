// src/controllers/checkoutController.ts

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  layTrangThaiThanhToanCheckout,
  taoQrThanhToanCheckout,
  thucHienCheckOut,
  xacNhanThanhToanOffline,
  xuLyMomoIpnCheckout,
} from "../services/checkoutService";

// PATCH /api/check-out/:maDatPhong
export async function checkOut(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }

  try {
    if (!req.user?.idNhanVien) {
      res.status(401).json({ success: false, message: "Chưa xác thực." });
      return;
    }

    const result = await thucHienCheckOut({
      maDatPhong: req.params.maDatPhong,
      idNhanVien: req.user.idNhanVien,
      phuPhi: req.body.phuPhi ?? 0,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/bookings/:id/checkout
export async function checkoutBookingById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }

  try {
    if (!req.user?.idNhanVien) {
      res.status(401).json({ success: false, message: "Chưa xác thực." });
      return;
    }

    const result = await thucHienCheckOut({
      bookingId: req.params.id,
      idNhanVien: req.user.idNhanVien,
      actualCheckOutDate: req.body.actualCheckOutDate,
      surcharges: req.body.surcharges,
      phuPhi: req.body.phuPhi,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/checkout/offline
export async function checkoutOffline(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }

  try {
    if (!req.user?.idNhanVien) {
      res.status(401).json({ success: false, message: "Chưa xác thực." });
      return;
    }

    const result = await xacNhanThanhToanOffline({
      invoiceId: req.body.invoiceId,
      paymentMethod: req.body.paymentMethod,
      idNhanVien: req.user.idNhanVien,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/checkout/generate-qr
export async function checkoutGenerateQr(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }

  try {
    if (!req.user?.idNhanVien) {
      res.status(401).json({ success: false, message: "Chưa xác thực." });
      return;
    }

    const result = await taoQrThanhToanCheckout({
      invoiceId: req.body.invoiceId,
      idNhanVien: req.user.idNhanVien,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/checkout/momo-ipn
export async function checkoutMomoIpn(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await xuLyMomoIpnCheckout(req.body as Record<string, unknown>);
    res.status(200).json({ resultCode: 0, message: "OK" });
  } catch (error) {
    console.error("[Checkout MoMo IPN] Error:", error);
    res.status(200).json({ resultCode: 1, message: "ERROR" });
  }
}

// GET /api/checkout/status/:invoiceId
export async function getCheckoutStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }

  try {
    const result = await layTrangThaiThanhToanCheckout(req.params.invoiceId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
