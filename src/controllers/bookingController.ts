// src/controllers/bookingController.ts

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  taoDatPhong,
  danhSachDatPhong,
  danhSachDatPhongCuaToi,
  chiTietDatPhong,
  chiTietDatPhongTheoBookingRef,
  lichSuCheckInCheckOut30Ngay,
  huyDatPhong,
  xacNhanDatPhong,
} from "../services/bookingService";

// POST /api/dat-phong
export async function createBooking(
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
    const result = await taoDatPhong(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/dat-phong
export async function listBookings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { trangThai, search, page, pageSize } = req.query as {
      trangThai?: string;
      search?: string;
      page?: string;
      pageSize?: string;
    };

    const result = await danhSachDatPhong({
      trangThai,
      search,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/dat-phong/:maDatPhong
export async function getBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await chiTietDatPhong(req.params.maDatPhong);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/bookings/:id
export async function getBookingById(
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
    const result = await chiTietDatPhongTheoBookingRef(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/bookings/history
export async function getBookingHistory(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await lichSuCheckInCheckOut30Ngay();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/bookings/my
export async function getMyBookings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.authUserId) {
      res.status(401).json({ success: false, message: "Chưa xác thực." });
      return;
    }

    const result = await danhSachDatPhongCuaToi(req.authUserId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/dat-phong/:maDatPhong
export async function cancelBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await huyDatPhong(req.params.maDatPhong);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/dat-phong/:maDatPhong/xac-nhan
export async function confirmBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.idNhanVien) {
      res.status(401).json({ success: false, message: "Chưa xác thực." });
      return;
    }

    const result = await xacNhanDatPhong(
      req.params.maDatPhong,
      req.user.idNhanVien,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}
