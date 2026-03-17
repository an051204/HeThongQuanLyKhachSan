"use client";
// ============================================================
// src/app/login/page.tsx — Trang đăng nhập dành cho nhân viên
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppToast } from "@/hooks/useAppToast";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ taiKhoan: "", matKhau: "" });
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { error } = useAppToast();

  // Nếu đã đăng nhập → chuyển thẳng vào dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/admin/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login({ taiKhoan: form.taiKhoan, matKhau: form.matKhau });
      router.replace("/admin/dashboard");
    } catch (err) {
      error(err instanceof Error ? err.message : "Đăng nhập thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <BedDouble className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">KhachSan Pro</h1>
          <p className="text-sm text-gray-500">Đăng nhập dành cho nhân viên</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tài khoản */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Tài khoản
              </label>
              <input
                type="text"
                autoComplete="username"
                value={form.taiKhoan}
                onChange={(e) => setForm({ ...form, taiKhoan: e.target.value })}
                placeholder="Nhập tài khoản..."
                required
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
              />
            </div>

            {/* Mật khẩu */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.matKhau}
                  onChange={(e) =>
                    setForm({ ...form, matKhau: e.target.value })
                  }
                  placeholder="Nhập mật khẩu..."
                  required
                  disabled={submitting}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Nút đăng nhập */}
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Đăng nhập
                </>
              )}
            </button>
          </form>

          {/* Ghi chú setup */}
          <p className="mt-6 text-center text-xs text-gray-400">
            Lần đầu sử dụng?{" "}
            <a href="/register" className="text-blue-600 hover:underline">
              Tạo tài khoản khách hàng
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
