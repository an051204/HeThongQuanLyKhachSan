// src/middleware/errorHandler.ts

import { Request, Response, NextFunction } from "express";

// ── Custom error class ────────────────────────────────────────
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
    // Đảm bảo prototype chain hoạt động đúng với TypeScript
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── 404 handler ───────────────────────────────────────────────
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy route: ${req.method} ${req.originalUrl}`,
  });
}

// ── Global error handler ──────────────────────────────────────
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // next phải có mặt trong signature để Express nhận diện đây là error handler
  _next: NextFunction,
): void {
  console.error(`[Error] ${err.name}: ${err.message}`);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Lỗi không xác định — che thông tin nội bộ với client
  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Lỗi máy chủ nội bộ. Vui lòng thử lại sau.",
  });
}
