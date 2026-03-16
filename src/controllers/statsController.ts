// src/controllers/statsController.ts

import { Request, Response, NextFunction } from "express";
import { layThongKeTongQuan } from "../services/statsService";

export async function getDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await layThongKeTongQuan();
    res.json(result);
  } catch (err) {
    next(err);
  }
}
