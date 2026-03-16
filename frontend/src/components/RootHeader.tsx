"use client";
// ============================================================
// src/components/RootHeader.tsx
// Header chính của ứng dụng — hiển thị trạng thái đăng nhập
// ============================================================

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BedDouble,
  LogIn,
  LogOut,
  UserCircle,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const ROLE_LABEL: Record<string, string> = {
  QuanLy: "Quản lý",
  LeTan: "Lễ tân",
  KeToan: "Kế toán",
  BuongPhong: "Buồng phòng",
};

const NAV_LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/dat-phong", label: "Đặt phòng" },
  { href: "/thanh-toan", label: "Thanh toán" },
];

export default function RootHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-[0_12px_40px_-22px_rgba(2,6,23,0.65)]">
          <Link href="/" className="group flex items-center gap-3">
            <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 text-white shadow-md">
              <BedDouble className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 rounded-full bg-amber-300 p-0.5 text-slate-800">
                <Sparkles className="h-2.5 w-2.5" />
              </span>
            </span>
            <span>
              <strong className="block text-base leading-none text-slate-900">
                Khách Sạn Pro
              </strong>
              <span className="text-xs text-slate-500">
                Đặt phòng và vận hành thông minh
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 md:flex">
            {NAV_LINKS.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <>
                <Link
                  href="/admin/dashboard"
                  className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-cyan-200 hover:text-cyan-700 sm:flex"
                >
                  <UserCircle className="h-4 w-4" />
                  <span className="max-w-32 truncate">{user.hoTen}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-medium text-cyan-700">
                    <ShieldCheck className="h-3 w-3" />
                    {ROLE_LABEL[user.vaiTro] ?? user.vaiTro}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:translate-y-[-1px] hover:shadow-md"
              >
                <LogIn className="h-4 w-4" />
                Đăng nhập
              </Link>
            )}
          </div>
        </div>

        {isAuthenticated && user && (
          <div className="mt-2 flex items-center justify-end text-xs text-slate-500 sm:hidden">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1">
              <UserCircle className="h-3.5 w-3.5" />
              {user.hoTen} • {ROLE_LABEL[user.vaiTro] ?? user.vaiTro}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
