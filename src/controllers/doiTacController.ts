// src/controllers/doiTacController.ts

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  layDanhSachDoiTac,
  layChiTietDoiTac,
  taoDoiTac,
  capNhatDoiTac,
  taoApiKey,
} from "../services/doiTacService";

export async function listDoiTac(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await layDanhSachDoiTac();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getDoiTac(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await layChiTietDoiTac(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createDoiTac(
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
    const result = await taoDoiTac(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateDoiTac(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await capNhatDoiTac(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function generateApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await taoApiKey(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
