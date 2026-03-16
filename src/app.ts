// src/app.ts — Cấu hình Express application

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authenticate, requireRole } from "./middleware/authMiddleware";
import authRoutes from "./routes/authRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import checkinRoutes from "./routes/checkinRoutes";
import checkoutRoutes from "./routes/checkoutRoutes";
import roomRoutes from "./routes/roomRoutes";
import loaiPhongRoutes from "./routes/loaiPhongRoutes";
import dichVuRoutes from "./routes/dichVuRoutes";
import doiTacRoutes from "./routes/doiTacRoutes";
import customerRoutes from "./routes/customerRoutes";
import invoiceRoutes from "./routes/invoiceRoutes";
import statsRoutes from "./routes/statsRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import bookingMomoRoutes from "./routes/bookingMomoRoutes";

const app = express();
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT ?? "20mb";

// ── Bảo mật & tiện ích ──────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: requestBodyLimit }));

// ── Health check (public) ─────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Auth routes (public: login, setup) ───────────────────────
app.use("/api/auth", authRoutes);

// ── Payment routes (public: MoMo payment, IPN callback) ───────
app.use("/api/payment", paymentRoutes);

// ── Booking deposit routes (public: MoMo booking v2) ──────────
app.use("/api/bookings", bookingMomoRoutes);

// ── Public routes (khách hàng không cần đăng nhập) ───────────
// Tìm phòng, đặt phòng, xem phòng, xem loại phòng
app.use("/api/phong", roomRoutes);
app.use("/api/loai-phong", loaiPhongRoutes);
app.use("/api/dat-phong", bookingRoutes);
app.use("/api/khach-hang", customerRoutes);

// ── Protected routes (yêu cầu đăng nhập) ────────────────────
// Lễ tân: check-in, check-out, hóa đơn
app.use(
  "/api/check-in",
  authenticate,
  requireRole("LeTan", "QuanLy"),
  checkinRoutes,
);
app.use("/api/check-out", checkoutRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use(
  "/api/hoa-don",
  authenticate,
  requireRole("LeTan", "QuanLy", "KeToan"),
  invoiceRoutes,
);

// Dashboard thống kê: cho toàn bộ staff nội bộ
app.use(
  "/api/thong-ke",
  authenticate,
  requireRole("QuanLy", "LeTan", "KeToan", "BuongPhong"),
  statsRoutes,
);

// Dịch vụ: lễ tân thêm dịch vụ cho khách đang ở
app.use(
  "/api/dich-vu",
  authenticate,
  requireRole("LeTan", "QuanLy", "KeToan"),
  dichVuRoutes,
);

// Đối tác B2B: chỉ QuanLy quản lý
app.use("/api/doi-tac", authenticate, requireRole("QuanLy"), doiTacRoutes);

// ── Error handlers (phải đặt cuối cùng) ─────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
