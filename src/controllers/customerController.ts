import { xoaKhachHang } from "../services/customerService";
// src/controllers/customerController.ts

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  upsertKhachHang,
  layDanhSachKhachHang,
  layChiTietKhachHang,
} from "../services/customerService";

export async function upsertCustomer(
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
    const result = await upsertKhachHang(req.body);
    res.status(result.data.isNew ? 201 : 200).json(result);
  } catch (err: any) {
    // Nếu là lỗi trùng CCCD/hộ chiếu (409), trả về message rõ ràng cho client
    if (err.statusCode === 409) {
      res.status(409).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
}

export async function listCustomers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { search } = req.query as { search?: string };
    const result = await layDanhSachKhachHang(search);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCustomer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await layChiTietKhachHang(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/khach-hang/:id — xóa khách hàng
export async function deleteCustomer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await xoaKhachHang(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
