// src/controllers/checkinController.ts

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  thucHienCheckIn,
  thucHienCheckInTheoBookingId,
} from "../services/checkinService";

// PATCH /api/check-in/:maDatPhong
export async function checkIn(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await thucHienCheckIn(req.params.maDatPhong);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/bookings/:id/checkin
export async function checkInBookingById(
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
    const result = await thucHienCheckInTheoBookingId(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
