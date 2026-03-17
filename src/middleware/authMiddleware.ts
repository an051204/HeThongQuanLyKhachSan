// ============================================================
// src/middleware/authMiddleware.ts
// JWT authentication + Role-based Authorization
//
// Roles:
//   QuanLy  → Quản lý (full access)
//   LeTan   → Lễ tân (check-in, check-out, view bookings)
// ============================================================

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthUser {
  idNhanVien?: string;
  userId?: string;
  taiKhoan: string;
  hoTen: string;
  vaiTro: string;
  sdt?: string;
  email?: string;
}

type AuthTokenPayload = jwt.JwtPayload & {
  idNhanVien?: string;
  idKhachHang?: string;
  userId?: string;
  id?: string;
  taiKhoan?: string;
  hoTen?: string;
  vaiTro?: string;
  sdt?: string;
  email?: string;
};

function normalizeRole(role: string | undefined): string {
  return (role ?? "").trim().toLowerCase();
}

function isReceptionOrAdminRole(role: string | undefined): boolean {
  const normalized = normalizeRole(role);
  return ["letan", "quanly", "admin", "le_tan", "quan_ly"].includes(normalized);
}

// Mở rộng Express Request để có thêm field `user`
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      authUserId?: string | null;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET!;

function extractBearerToken(authorization?: string): string | undefined {
  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorization.slice(7);
}

function resolveAuthUserId(payload: AuthTokenPayload): string | null {
  const candidate =
    payload.userId ?? payload.idKhachHang ?? payload.idNhanVien ?? payload.id;

  if (!candidate || typeof candidate !== "string") {
    return null;
  }

  const trimmed = candidate.trim();
  return trimmed ? trimmed : null;
}

function decodeJwtToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}

/** Middleware: xác thực JWT. Gắn req.user nếu hợp lệ. */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.",
    });
    return;
  }

  try {
    const payload = decodeJwtToken(token);
    req.authUserId = resolveAuthUserId(payload);
    req.user = {
      idNhanVien: payload.idNhanVien,
      userId: payload.userId,
      taiKhoan: payload.taiKhoan ?? "",
      hoTen: payload.hoTen ?? "",
      vaiTro: payload.vaiTro ?? "",
      sdt: payload.sdt,
      email: payload.email,
    };
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
    });
  }
}

/** Middleware: xác thực JWT tùy chọn. Không có token vẫn cho đi tiếp. */
export function authenticateOptional(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    req.user = undefined;
    req.authUserId = null;
    next();
    return;
  }

  try {
    const payload = decodeJwtToken(token);
    req.authUserId = resolveAuthUserId(payload);
    req.user = {
      idNhanVien: payload.idNhanVien,
      userId: payload.userId,
      taiKhoan: payload.taiKhoan ?? "",
      hoTen: payload.hoTen ?? "",
      vaiTro: payload.vaiTro ?? "",
      sdt: payload.sdt,
      email: payload.email,
    };
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
    });
  }
}

/** Middleware factory: kiểm tra role. Phải dùng sau authenticate(). */
export function requireRole(...roles: string[]) {
  const allowedRoles = roles.map((role) => normalizeRole(role));
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Chưa xác thực." });
      return;
    }
    if (!allowedRoles.includes(normalizeRole(req.user.vaiTro))) {
      res.status(403).json({
        success: false,
        message: `Không có quyền. Yêu cầu vai trò: ${roles.join(" hoặc ")}.`,
      });
      return;
    }
    next();
  };
}

/** Middleware chuyên biệt cho nghiệp vụ check-out: chỉ lễ tân hoặc admin. */
export function requireCheckoutPermission(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Chưa xác thực." });
    return;
  }

  if (!isReceptionOrAdminRole(req.user.vaiTro)) {
    res.status(403).json({
      success: false,
      message:
        "Forbidden: Chỉ role letan/admin (tương ứng LeTan/QuanLy) được phép check-out.",
    });
    return;
  }

  next();
}
