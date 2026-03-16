// src/controllers/dichVuController.ts

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  layDanhSachDichVu,
  taoDichVu,
  capNhatDichVu,
  themDichVuVaoPhieu,
  layDichVuCuaPhieu,
} from "../services/dichVuService";

export async function listDichVu(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const chiLayActive = req.query.tatCa !== "true";
    const result = await layDanhSachDichVu(chiLayActive);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createDichVu(
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
    const result = await taoDichVu(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateDichVu(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await capNhatDichVu(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Thêm dịch vụ vào một phiếu đặt phòng đang check-in
export async function addDichVuToBooking(
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
    const result = await themDichVuVaoPhieu({
      maDatPhong: req.params.maDatPhong,
      idDichVu: req.body.idDichVu,
      soLuong: req.body.soLuong,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// Lấy dịch vụ đã dùng của một phiếu
export async function getDichVuOfBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await layDichVuCuaPhieu(req.params.maDatPhong);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
