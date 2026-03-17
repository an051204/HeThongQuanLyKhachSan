"use client";
// ============================================================
// src/components/RootHeader.tsx
// Header chính của ứng dụng — hiển thị trạng thái đăng nhập
// ============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BedDouble, LogIn, UserCircle, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UserDropdown from "@/components/UserDropdown";

const ROLE_LABEL: Record<string, string> = {
  QuanLy: "Quản lý",
  LeTan: "Lễ tân",
  KeToan: "Kế toán",
  BuongPhong: "Buồng phòng",
  KhachHang: "Khách hàng",
};

const NAV_LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/dat-phong", label: "Đặt phòng" },
  { href: "/thanh-toan", label: "Thanh toán" },
];

export default function RootHeader() {
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const isCustomer = user?.vaiTro === "KhachHang";
  const profileLink = "/profile";
  const navLinks =
    isAuthenticated && isCustomer
      ? [...NAV_LINKS, { href: "/booking/my", label: "Phòng đã đặt" }]
      : NAV_LINKS;

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
            {navLinks.map((item) => {
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
              <UserDropdown profileHref={profileLink} />
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
