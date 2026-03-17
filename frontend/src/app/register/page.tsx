"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Eye, EyeOff, User } from "lucide-react";
import apiClient from "@/lib/api";
import { useAppToast } from "@/hooks/useAppToast";
import type { ApiResponse } from "@/types";

interface RegisterCustomerResponse {
  idNhanVien: string;
  hoTen: string;
  taiKhoan: string;
  sdt?: string | null;
  email?: string | null;
  vaiTro: "KhachHang";
  createdAt: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { success, error } = useAppToast();

  const [form, setForm] = useState({
    hoTen: "",
    sdt: "",
    taiKhoan: "",
    matKhau: "",
    xacNhanMatKhau: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.matKhau !== form.xacNhanMatKhau) {
      error("Mật khẩu xác nhận không khớp.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post<ApiResponse<RegisterCustomerResponse>>(
        "/auth/register-customer",
        {
          hoTen: form.hoTen,
          sdt: form.sdt || undefined,
          taiKhoan: form.taiKhoan,
          matKhau: form.matKhau,
        },
      );

      success("Đăng ký thành công");
      router.replace("/login");
    } catch (err) {
      error(err instanceof Error ? err.message : "Đăng ký thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-600 shadow-lg">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Đăng ký tài khoản
          </h1>
          <p className="text-sm text-gray-500">Dành cho khách hàng</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Họ tên
              </label>
              <input
                type="text"
                value={form.hoTen}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, hoTen: e.target.value }))
                }
                placeholder="Nguyen Van A"
                required
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email/Tài khoản
              </label>
              <input
                type="text"
                value={form.taiKhoan}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, taiKhoan: e.target.value }))
                }
                placeholder="email@example.com"
                required
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Số điện thoại (tùy chọn)
              </label>
              <input
                type="tel"
                value={form.sdt}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sdt: e.target.value }))
                }
                placeholder="0901234567"
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.matKhau}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, matKhau: e.target.value }))
                  }
                  minLength={6}
                  required
                  disabled={submitting}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 disabled:bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
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
                type={showPassword ? "text" : "password"}
                value={form.xacNhanMatKhau}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    xacNhanMatKhau: e.target.value,
                  }))
                }
                required
                disabled={submitting}
                placeholder="Nhập lại mật khẩu"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 disabled:bg-gray-50"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <User className="h-4 w-4" />
                  Đăng ký tài khoản
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-400">
            Đã có tài khoản?{" "}
            <a href="/login" className="text-cyan-600 hover:underline">
              Đăng nhập
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
