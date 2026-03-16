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
  idNhanVien: string;
  taiKhoan: string;
  hoTen: string;
  vaiTro: string;
}

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
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET!;

/** Middleware: xác thực JWT. Gắn req.user nếu hợp lệ. */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.",
    });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = payload;
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
