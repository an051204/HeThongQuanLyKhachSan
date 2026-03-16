// src/controllers/loaiPhongController.ts

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  layDanhSachLoaiPhong,
  layChiTietLoaiPhong,
  taoLoaiPhong,
  capNhatLoaiPhong,
  xoaLoaiPhong,
} from "../services/loaiPhongService";

export async function listLoaiPhong(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { search, page, pageSize } = req.query as {
      search?: string;
      page?: string;
      pageSize?: string;
    };

    const result = await layDanhSachLoaiPhong({
      search,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getLoaiPhong(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await layChiTietLoaiPhong(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createLoaiPhong(
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
    const result = await taoLoaiPhong(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateLoaiPhong(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await capNhatLoaiPhong(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteLoaiPhong(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await xoaLoaiPhong(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
