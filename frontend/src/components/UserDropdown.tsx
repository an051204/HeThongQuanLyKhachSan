"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  Landmark,
  LogOut,
  ReceiptText,
  Sparkles,
  User,
  Users,
  HandCoins,
  Clock3,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface DropdownLinkItem {
  href: string;
  label: string;
  icon: typeof User;
}

export interface UserDropdownProps {
  profileHref?: string;
}

export default function UserDropdown({
  profileHref = "/profile",
}: UserDropdownProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const avatarLabel = useMemo(() => {
    const name = user?.hoTen?.trim();
    if (!name) {
      return "U";
    }

    return name.charAt(0).toUpperCase();
  }, [user?.hoTen]);

  const roleLinks = useMemo<DropdownLinkItem[]>(() => {
    if (!user) return [];

    if (user.vaiTro === "KhachHang") {
      return [
        { href: "/", label: "Trang chủ", icon: Landmark },
        { href: "/booking/my", label: "Phòng đã đặt", icon: BedDouble },
        { href: "/dat-phong", label: "Đặt phòng", icon: ClipboardCheck },
        { href: "/thanh-toan", label: "Thanh toán", icon: CreditCard },
      ];
    }

    if (user.vaiTro === "QuanLy") {
      return [
        { href: "/admin/dashboard", label: "Dashboard", icon: Landmark },
        {
          href: "/admin/dat-phong",
          label: "Đặt phòng",
          icon: ClipboardCheck,
        },
        { href: "/admin/check-in", label: "Check-in", icon: ClipboardCheck },
        {
          href: "/admin/check-out",
          label: "Check-out",
          icon: ClipboardCheck,
        },
        { href: "/admin/hoa-don", label: "Hóa đơn", icon: CreditCard },
        {
          href: "/admin/khach-hang",
          label: "Quản lý khách hàng",
          icon: Users,
        },
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

    if (user.vaiTro === "LeTan") {
      return [
        { href: "/admin/dashboard", label: "Dashboard", icon: Landmark },
        {
          href: "/admin/dat-phong",
          label: "Đặt phòng tại quầy",
          icon: ClipboardCheck,
        },
        { href: "/admin/check-in", label: "Check-in", icon: ClipboardCheck },
        {
          href: "/admin/check-out",
          label: "Check-out",
          icon: ClipboardCheck,
        },
        { href: "/admin/hoa-don", label: "Hóa đơn", icon: CreditCard },
        {
          href: "/admin/khach-hang",
          label: "Khách hàng",
          icon: Users,
        },
      ];
    }

    if (user.vaiTro === "KeToan") {
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

    return [
      { href: "/admin/dashboard", label: "Dashboard", icon: Landmark },
      {
        href: "/admin/buong-phong",
        label: "Buồng phòng",
        icon: Sparkles,
      },
    ];
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!user) {
    return null;
  }

  function handleLogout() {
    logout();
    setIsOpen(false);
    router.replace("/login");
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-cyan-200 hover:bg-cyan-50/50"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-cyan-600 text-sm font-semibold text-white shadow-sm">
          {avatarLabel}
        </span>

        <span className="hidden max-w-36 truncate text-sm font-medium text-slate-700 sm:block">
          {user.hoTen}
        </span>

        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_36px_-18px_rgba(15,23,42,0.45)]">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">
              {user.hoTen}
            </p>
            <p className="truncate text-xs text-slate-500">
              {user.email || user.taiKhoan}
            </p>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-1.5">
            <Link
              href={profileHref}
              onClick={() => setIsOpen(false)}
              className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
            >
              <User className="h-4 w-4" />
              Hồ sơ cá nhân
            </Link>

            {roleLinks.length > 0 ? (
              <>
                <div className="my-1 border-t border-slate-200" />
                {roleLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsOpen(false)}
                    className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </>
            ) : null}

            <div className="my-1 border-t border-slate-200" />

            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
