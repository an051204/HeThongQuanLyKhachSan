// src/controllers/roomController.ts

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  layDanhSachPhong,
  layChiTietPhong,
  taoPhong,
  capNhatPhong,
  xoaPhong,
  donDepPhong,
  timPhongTrong,
} from "../services/roomService";

export async function listPhong(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { tinhTrang, search, page, pageSize } = req.query as {
      tinhTrang?: string;
      search?: string;
      page?: string;
      pageSize?: string;
    };
    const result = await layDanhSachPhong({
      tinhTrang,
      search,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function searchPhongTrong(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      ngayDen,
      ngayDi,
      loaiPhong,
      sucChuaMin,
      kichCo,
      soGiuongMin,
      giaTu,
      giaDen,
      tienNghi,
    } = req.query as {
      ngayDen?: string;
      ngayDi?: string;
      loaiPhong?: string;
      sucChuaMin?: string;
      kichCo?: "" | "small" | "medium" | "large";
      soGiuongMin?: string;
      giaTu?: string;
      giaDen?: string;
      tienNghi?: string;
    };
    const result = await timPhongTrong({
      ngayDen,
      ngayDi,
      loaiPhong,
      sucChuaMin,
      kichCo,
      soGiuongMin,
      giaTu,
      giaDen,
      tienNghi,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPhong(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await layChiTietPhong(req.params.soPhong);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createPhong(
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
    const result = await taoPhong(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updatePhong(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await capNhatPhong(req.params.soPhong, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deletePhong(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await xoaPhong(req.params.soPhong);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function cleanRoom(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await donDepPhong(req.params.soPhong, req.user?.idNhanVien);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
