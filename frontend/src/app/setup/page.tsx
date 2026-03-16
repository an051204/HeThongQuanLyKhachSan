"use client";
// ============================================================
// src/app/setup/page.tsx — Tạo tài khoản quản lý lần đầu
// Chỉ hoạt động nếu chưa có nhân viên nào trong hệ thống
// ============================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, Eye, EyeOff, Shield } from "lucide-react";
import apiClient from "@/lib/api";
import { useAppToast } from "@/hooks/useAppToast";
import type { ApiResponse, LoginResponse } from "@/types";

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    hoTen: "",
    taiKhoan: "",
    matKhau: "",
    xacNhanMatKhau: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { error } = useAppToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.matKhau !== form.xacNhanMatKhau) {
      error("Mật khẩu xác nhận không khớp.");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post<ApiResponse<LoginResponse>>("/auth/setup", {
        hoTen: form.hoTen,
        taiKhoan: form.taiKhoan,
        matKhau: form.matKhau,
      });
      router.replace("/login");
    } catch (err) {
      error(err instanceof Error ? err.message : "Tạo tài khoản thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cài đặt hệ thống</h1>
          <p className="text-sm text-gray-500">
            Tạo tài khoản quản lý đầu tiên
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-5 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <BedDouble className="h-4 w-4 shrink-0" />
            Bước này chỉ thực hiện được một lần khi hệ thống chưa có nhân viên
            nào.
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Họ tên
              </label>
              <input
                type="text"
                value={form.hoTen}
                onChange={(e) => setForm({ ...form, hoTen: e.target.value })}
                placeholder="Nguyễn Văn A"
                required
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Tài khoản
              </label>
              <input
                type="text"
                value={form.taiKhoan}
                onChange={(e) => setForm({ ...form, taiKhoan: e.target.value })}
                placeholder="admin"
                required
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.matKhau}
                  onChange={(e) =>
                    setForm({ ...form, matKhau: e.target.value })
                  }
                  placeholder="Tối thiểu 6 ký tự"
                  required
                  minLength={6}
                  disabled={submitting}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:bg-gray-50"
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
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Xác nhận mật khẩu
              </label>
              <input
                type={showPass ? "text" : "password"}
                value={form.xacNhanMatKhau}
                onChange={(e) =>
                  setForm({ ...form, xacNhanMatKhau: e.target.value })
                }
                placeholder="Nhập lại mật khẩu"
                required
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:bg-gray-50"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Tạo tài khoản quản lý
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-400">
            Đã có tài khoản?{" "}
            <a href="/login" className="text-emerald-600 hover:underline">
              Đăng nhập
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
