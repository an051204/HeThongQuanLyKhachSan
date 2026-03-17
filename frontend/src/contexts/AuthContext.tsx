"use client";
// ============================================================
// src/contexts/AuthContext.tsx
// Quản lý trạng thái đăng nhập toàn ứng dụng (JWT + user info)
// ============================================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { NhanVien, LoginInput, LoginResponse } from "@/types";
import apiClient from "@/lib/api";
import type { ApiResponse } from "@/types";

// ── Hằng số ──────────────────────────────────────────────────
const TOKEN_KEY = "khachsan_token";
const USER_KEY = "khachsan_user";

// ── Context types ─────────────────────────────────────────────
interface AuthContextValue {
  user: NhanVien | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
  updateCurrentUser: (payload: Partial<NhanVien>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<NhanVien | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Khôi phục session từ localStorage khi app khởi động
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser) as NhanVien);
      } catch {
        // Dữ liệu localStorage bị hỏng → xóa đi
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (input: LoginInput): Promise<void> => {
    const { data } = await apiClient.post<ApiResponse<LoginResponse>>(
      "/auth/login",
      input,
    );
    const result = data.data!;
    // Lưu vào state + localStorage
    setToken(result.token);
    setUser(result.nhanVien);
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.nhanVien));
  }, []);

  const logout = useCallback((): void => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const updateCurrentUser = useCallback((payload: Partial<NhanVien>): void => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...payload };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth phải được dùng bên trong <AuthProvider>");
  }
  return ctx;
}
