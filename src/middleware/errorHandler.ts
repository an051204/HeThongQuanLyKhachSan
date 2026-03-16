// src/middleware/errorHandler.ts

import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

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
  if (err.stack) {
    console.error(err.stack);
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    res.status(500).json({
      success: false,
      message:
        "Không thể khởi tạo Prisma Client trên môi trường server. Hãy kiểm tra DATABASE_URL/DIRECT_URL và bảo đảm Prisma Client được generate khi build.",
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2021" || err.code === "P2022") {
      res.status(500).json({
        success: false,
        message:
          "Schema database chưa đồng bộ với code hiện tại (thiếu bảng/cột). Hãy chạy prisma migrate deploy trên database production.",
      });
      return;
    }

    if (err.code === "P2002") {
      res.status(409).json({
        success: false,
        message:
          "Dữ liệu bị trùng khóa duy nhất. Vui lòng kiểm tra lại thông tin.",
      });
      return;
    }

    if (err.code === "P2025") {
      res.status(404).json({
        success: false,
        message: "Không tìm thấy dữ liệu tương ứng.",
      });
      return;
    }
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
