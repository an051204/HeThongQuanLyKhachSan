// src/controllers/invoiceController.ts

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  layDanhSachHoaDon,
  layChiTietHoaDon,
  thanhToanHoaDon,
  xuatHoaDonHtml,
} from "../services/invoiceService";

export async function listInvoices(
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

    const result = await layDanhSachHoaDon({
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

export async function getInvoice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await layChiTietHoaDon(req.params.maHoaDon);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function payInvoice(
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
    const phuongThucTT =
      typeof req.body?.phuongThucTT === "string"
        ? req.body.phuongThucTT
        : undefined;

    const result = await thanhToanHoaDon(req.params.maHoaDon, {
      phuongThucTT,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function exportInvoice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await xuatHoaDonHtml(req.params.maHoaDon);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.fileName}"`,
    );
    res.send(result.content);
  } catch (err) {
    next(err);
  }
}
