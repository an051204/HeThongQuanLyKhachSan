// ============================================================
// src/lib/db.ts
// Cấu hình kết nối Prisma Client dành cho Vercel Serverless
// Updated: schema expanded with LoaiPhong, DichVu, DoiTac, etc.
//
// Vấn đề trên Serverless:
//   Mỗi lần cold-start, Node.js khởi tạo module mới → nếu tạo
//   PrismaClient() trực tiếp, mỗi invocation sẽ mở một connection
//   pool mới, nhanh chóng làm cạn kiệt connection limit của Neon.
//
// Giải pháp — Singleton Pattern + Neon Pooler:
//   1. Lưu instance vào global object (tồn tại suốt thời gian
//      Serverless Function còn "warm") để tái sử dụng connection.
//   2. DATABASE_URL trỏ đến Neon Serverless Pooler (PgBouncer)
//      với ?pgbouncer=true&connection_limit=1 → Prisma chỉ giữ
//      tối đa 1 kết nối thực sự, phần còn lại PgBouncer lo.
// ============================================================

import { PrismaClient } from "@prisma/client";

// Khai báo kiểu mở rộng cho global để TypeScript không báo lỗi
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
    errorFormat: "pretty",
  });
}

// Singleton: tái sử dụng nếu đã tồn tại (warm invocation)
const prisma: PrismaClient = globalThis.__prisma ?? createPrismaClient();

// Chỉ gán vào global ở môi trường development để hỗ trợ hot-reload
// Môi trường production không cần (Vercel quản lý lifecycle)
if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

export default prisma;
