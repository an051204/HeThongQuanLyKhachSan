// src/controllers/bookingMomoController.ts

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  buildBookingMomoCallbackRedirect,
  type CreateBookingWithMomoInput,
  createBookingWithMomoPayment,
  processBookingMomoIpn,
} from "../services/bookingMomoService";

export async function createBookingAndPayDeposit(
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
    const result = await createBookingWithMomoPayment({
      ...(req.body as Omit<CreateBookingWithMomoInput, "userId">),
      userId: req.authUserId ?? null,
    });
    res.status(201).json({
      success: true,
      message:
        "Đã tạo yêu cầu thanh toán. Booking chỉ được ghi nhận sau khi MoMo báo thanh toán thành công.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleBookingMomoIpn(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await processBookingMomoIpn(req.body as Record<string, unknown>);
  } catch (error) {
    console.error("[Booking MoMo IPN] Error:", error);
  }

  // MoMo requires quick acknowledgement from IPN endpoint.
  res.status(204).send();
}

export async function handleBookingMomoCallback(
  req: Request,
  res: Response,
): Promise<void> {
  const redirectUrl = await buildBookingMomoCallbackRedirect(
    req.query as Record<string, unknown>,
  );

  res.redirect(302, redirectUrl);
}
