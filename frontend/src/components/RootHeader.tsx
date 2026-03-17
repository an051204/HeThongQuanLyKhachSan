"use client";
// Shared menu link type
type MenuLink = {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
};

// Shared menu config function
function getMenuLinks(role: string): MenuLink[] {
  if (role === "KhachHang") {
    return [
      { href: "/", label: "Trang chủ", icon: Home },
      { href: "/booking/my", label: "Phòng đã đặt", icon: BedDouble },
      { href: "/dat-phong", label: "Đặt phòng", icon: CalendarCheck2 },
      {
        href: "/thanh-toan",
        label: "Thanh toán",
        icon: CreditCard,
        highlight: true,
      },
    ];
  }
  if (role === "QuanLy") {
    return [
      { href: "/admin/dashboard", label: "Dashboard", icon: Landmark },
      { href: "/admin/dat-phong", label: "Đặt phòng", icon: ClipboardCheck },
      { href: "/admin/check-in", label: "Check-in", icon: ClipboardCheck },
      { href: "/admin/check-out", label: "Check-out", icon: ClipboardCheck },
      { href: "/admin/hoa-don", label: "Hóa đơn", icon: CreditCard },
      { href: "/admin/khach-hang", label: "Quản lý khách hàng", icon: Users },
      { href: "/admin/phong", label: "Quản lý phòng", icon: BedDouble },
      { href: "/admin/ke-toan", label: "Kế toán", icon: ReceiptText },
      {
        href: "/admin/ke-toan/ca-doi-soat",
        label: "Ca đối soát",
        icon: Clock3,
      },
      {
        href: "/admin/ke-toan/phieu-thu-chi",
        label: "Phiếu thu/chi",
        icon: ReceiptText,
      },
      {
        href: "/admin/ke-toan/cong-no-doi-tac",
        label: "Công nợ đối tác",
        icon: HandCoins,
      },
    ];
  }
  if (role === "LeTan") {
    return [
      { href: "/admin/dashboard", label: "Dashboard", icon: Landmark },
      {
        href: "/admin/dat-phong",
        label: "Đặt phòng tại quầy",
        icon: ClipboardCheck,
      },
      { href: "/admin/check-in", label: "Check-in", icon: ClipboardCheck },
      { href: "/admin/check-out", label: "Check-out", icon: ClipboardCheck },
      { href: "/admin/hoa-don", label: "Hóa đơn", icon: CreditCard },
      { href: "/admin/khach-hang", label: "Khách hàng", icon: Users },
    ];
  }
  if (role === "KeToan") {
    return [
      { href: "/admin/dashboard", label: "Dashboard", icon: Landmark },
      { href: "/admin/hoa-don", label: "Hóa đơn", icon: CreditCard },
      { href: "/admin/ke-toan", label: "Kế toán", icon: ReceiptText },
      {
        href: "/admin/ke-toan/ca-doi-soat",
        label: "Ca đối soát",
        icon: Clock3,
      },
      {
        href: "/admin/ke-toan/phieu-thu-chi",
        label: "Phiếu thu/chi",
        icon: ReceiptText,
      },
      {
        href: "/admin/ke-toan/cong-no-doi-tac",
        label: "Công nợ đối tác",
        icon: HandCoins,
      },
    ];
  }
  // Buồng phòng hoặc vai trò khác
  return [
    { href: "/admin/dashboard", label: "Dashboard", icon: Landmark },
    { href: "/admin/buong-phong", label: "Buồng phòng", icon: Sparkles },
  ];
}
// ============================================================
// src/components/RootHeader.tsx
// Header chính của ứng dụng — hiển thị trạng thái đăng nhập
// ============================================================

import Link from "next/link";
import {
  BedDouble,
  CalendarCheck2,
  CreditCard,
  Home,
  LogIn,
  Menu,
  Sparkles,
  UserCircle,
  X,
  Landmark,
  ClipboardCheck,
  Users,
  ReceiptText,
  Clock3,
  HandCoins,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/dat-phong", label: "Đặt phòng", icon: CalendarCheck2 },
  { href: "/thanh-toan", label: "Thanh toán", icon: CreditCard },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function RootHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const isCustomer = user?.vaiTro === "KhachHang";
  const isAdminRoute = pathname.startsWith("/admin");
  const profileLink = "/profile";
  // Dùng chung menuLinks cho cả PC và Mobile
  const menuLinks = useMemo(
    () => getMenuLinks(user?.vaiTro ?? ""),
    [user?.vaiTro],
  );

  // Hàm logout đồng bộ với PC Dropdown
  function handleLogout() {
    logout();
    setIsMobileMenuOpen(false);
  }

  // Smart Header scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY && currentY > 60) {
        setShowHeader(false); // scroll down, hide
      } else {
        setShowHeader(true); // scroll up, show
      }
      setLastScrollY(currentY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isMobileMenuOpen]);

  // Close drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl transition-transform duration-300 ${
        showHeader ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 shadow-[0_12px_40px_-22px_rgba(2,6,23,0.65)] sm:gap-3 sm:px-4 sm:py-3">
          {/* Logo */}
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

          {/* Navigation links: hidden on mobile, flex on md+ */}
          <nav className="hidden md:flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <Link
              href="/"
              className={`inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActivePath(pathname, "/")
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Trang chủ
            </Link>
            <Link
              href="/dat-phong"
              className={`inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActivePath(pathname, "/dat-phong")
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Đặt phòng
            </Link>
            <Link
              href="/thanh-toan"
              className={`inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActivePath(pathname, "/thanh-toan")
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Thanh toán
            </Link>
          </nav>

          {/* Avatar Dropdown: PC only, must keep logic */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated && user ? (
              <UserDropdown profileHref={profileLink} />
            ) : (
              <Link
                href="/login"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-all hover:translate-y-[-1px] hover:shadow-md"
              >
                <LogIn className="h-4 w-4" />
                Đăng nhập
              </Link>
            )}
          </div>

          {/* Hamburger menu: Mobile only */}
          <button
            type="button"
            className="md:hidden inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 text-slate-700"
            aria-label="Mở menu"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {/* Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[50] transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-screen w-[80%] max-w-sm bg-white z-[60] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-900">Menu</span>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-slate-200 text-slate-700"
              aria-label="Đóng menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* User Info: moved to top */}
          {isAuthenticated && user && (
            <div className="flex flex-col items-center gap-2 mt-4 mb-2">
              <UserCircle className="h-12 w-12 text-slate-400" />
              <div className="text-base font-semibold text-slate-900">
                {user.hoTen}
              </div>
              <div className="text-xs text-slate-500">{user.email}</div>
              <div className="text-sm text-slate-500">
                {ROLE_LABEL[user.vaiTro] ?? user.vaiTro}
              </div>
            </div>
          )}
          <hr className="my-4 border-slate-200" />
        </div>
        {/* Body: Scrollable menu links */}
        <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-1">
          {menuLinks.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-lg transition-colors"
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
        {/* Footer: only logout/login button */}
        <div className="mt-auto p-4 border-t border-slate-200 w-full">
          {isAuthenticated && user ? (
            <button
              onClick={handleLogout}
              className="w-full rounded-xl bg-red-500 px-4 py-3 text-lg font-bold text-white"
            >
              Đăng xuất
            </button>
          ) : (
            <Link
              href="/login"
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-lg font-bold text-white text-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
