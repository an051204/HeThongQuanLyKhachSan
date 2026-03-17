"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { KeyRound, Save, UserCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppToast } from "@/hooks/useAppToast";
import apiClient, { updateMyProfile } from "@/lib/api";
import type { ApiResponse } from "@/types";

const ROLE_LABEL: Record<string, string> = {
  QuanLy: "Quản lý",
  LeTan: "Lễ tân",
  KeToan: "Kế toán",
  BuongPhong: "Buồng phòng",
  KhachHang: "Khách hàng",
};

interface ChangePasswordForm {
  matKhauCu: string;
  matKhauMoi: string;
  xacNhanMatKhauMoi: string;
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, updateCurrentUser } = useAuth();
  const router = useRouter();
  const { success, error } = useAppToast();

  const [savingContact, setSavingContact] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({
    email: "",
    sdt: "",
  });
  const [form, setForm] = useState<ChangePasswordForm>({
    matKhauCu: "",
    matKhauMoi: "",
    xacNhanMatKhauMoi: "",
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    setContactForm({
      email: user?.email ?? "",
      sdt: user?.sdt ?? "",
    });
  }, [user?.email, user?.sdt]);

  const homeLink = useMemo(() => {
    if (user?.vaiTro === "KhachHang") {
      return "/booking/my";
    }

    return "/admin/dashboard";
  }, [user?.vaiTro]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleContactChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ): void {
    const { name, value } = event.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSaveContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = contactForm.email.trim();
    const sdt = contactForm.sdt.trim();

    if (sdt && !/^(0|\+84)[0-9]{8,9}$/.test(sdt)) {
      error("Số điện thoại không hợp lệ.");
      return;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        error("Email không hợp lệ.");
        return;
      }
    }

    setSavingContact(true);
    try {
      const updated = await updateMyProfile({
        email: email || undefined,
        sdt: sdt || undefined,
      });
      updateCurrentUser({ email: updated.email, sdt: updated.sdt });
      success("Đã cập nhật thông tin liên hệ.");
    } catch (err) {
      error(err instanceof Error ? err.message : "Không thể lưu thông tin.");
    } finally {
      setSavingContact(false);
    }
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.matKhauCu || !form.matKhauMoi) {
      error("Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới.");
      return;
    }

    if (form.matKhauMoi.length < 6) {
      error("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (form.matKhauMoi !== form.xacNhanMatKhauMoi) {
      error("Xác nhận mật khẩu mới không khớp.");
      return;
    }

    setSubmitting(true);

    try {
      await apiClient.patch<ApiResponse<unknown>>("/auth/doi-mat-khau", {
        matKhauCu: form.matKhauCu,
        matKhauMoi: form.matKhauMoi,
      });

      success("Đổi mật khẩu thành công.");
      setForm({
        matKhauCu: "",
        matKhauMoi: "",
        xacNhanMatKhauMoi: "",
      });
    } catch (err) {
      error(err instanceof Error ? err.message : "Không thể đổi mật khẩu.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-cyan-600 text-white">
              <UserCircle className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                Hồ sơ cá nhân
              </h1>
              <p className="text-sm text-slate-500">
                Quản lý thông tin tài khoản đang đăng nhập.
              </p>
            </div>
          </div>

          <Link
            href={homeLink}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Về trang chính
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <InfoRow label="Họ tên" value={user.hoTen} />
          <InfoRow
            label="Vai trò"
            value={ROLE_LABEL[user.vaiTro] ?? user.vaiTro}
          />
          <InfoRow label="Tài khoản" value={user.taiKhoan} />
        </div>

        <form
          onSubmit={handleSaveContact}
          className="mt-5 grid gap-4 sm:grid-cols-2"
        >
          <Field
            label="Email"
            name="email"
            type="email"
            value={contactForm.email}
            onChange={handleContactChange}
            placeholder="name@example.com"
          />
          <Field
            label="Số điện thoại"
            name="sdt"
            type="tel"
            value={contactForm.sdt}
            onChange={handleContactChange}
            placeholder="0901234567"
          />

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={savingContact}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingContact ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Lưu email và số điện thoại
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-cyan-700" />
          <h2 className="text-lg font-semibold text-slate-900">Đổi mật khẩu</h2>
        </div>

        <form
          onSubmit={handleChangePassword}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field
            label="Mật khẩu cũ"
            name="matKhauCu"
            type="password"
            value={form.matKhauCu}
            onChange={handleChange}
            required
          />
          <div className="hidden sm:block" />
          <Field
            label="Mật khẩu mới"
            name="matKhauMoi"
            type="password"
            value={form.matKhauMoi}
            onChange={handleChange}
            required
          />
          <Field
            label="Xác nhận mật khẩu mới"
            name="xacNhanMatKhauMoi"
            type="password"
            value={form.xacNhanMatKhauMoi}
            onChange={handleChange}
            required
          />

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Cập nhật mật khẩu
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

interface FieldProps {
  label: string;
  name: string;
  type: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function Field({
  label,
  name,
  type,
  value,
  placeholder,
  required,
  onChange,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={onChange}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring-2"
      />
    </label>
  );
}
