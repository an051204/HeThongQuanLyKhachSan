"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LogIn,
  LogOut,
  LayoutGrid,
  LayoutDashboard,
  ClipboardList,
  Receipt,
  Users,
  ShieldCheck,
  UserCircle,
  Sparkles,
  ChevronDown,
  Wallet,
  Clock3,
  ReceiptText,
  HandCoins,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { VaiTroNhanVien } from "@/types";

type AdminNavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: VaiTroNhanVien[];
};

type AccountingNavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const ROLE_LABEL: Record<VaiTroNhanVien, string> = {
  QuanLy: "Quản lý",
  LeTan: "Lễ tân",
  KeToan: "Kế toán",
  BuongPhong: "Buồng phòng",
  KhachHang: "Khách hàng",
};

const ROLE_BADGE_CLASS: Record<VaiTroNhanVien, string> = {
  QuanLy: "bg-slate-100 text-slate-700",
  LeTan: "bg-emerald-100 text-emerald-700",
  KeToan: "bg-amber-100 text-amber-700",
  BuongPhong: "bg-cyan-100 text-cyan-700",
  KhachHang: "bg-blue-100 text-blue-700",
};

const NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Tổng quan",
    icon: LayoutDashboard,
    roles: ["QuanLy", "LeTan", "KeToan", "BuongPhong"],
  },
  {
    href: "/admin/dat-phong",
    label: "Đặt phòng",
    icon: ClipboardList,
    roles: ["QuanLy", "LeTan"],
  },
  {
    href: "/admin/check-in",
    label: "Check-in",
    icon: LogIn,
    roles: ["QuanLy", "LeTan"],
  },
  {
    href: "/admin/check-out",
    label: "Check-out",
    icon: LogOut,
    roles: ["QuanLy", "LeTan"],
  },
  {
    href: "/admin/hoa-don",
    label: "Hóa đơn",
    icon: Receipt,
    roles: ["QuanLy", "LeTan", "KeToan"],
  },
  {
    href: "/admin/khach-hang",
    label: "Khách hàng",
    icon: Users,
    roles: ["QuanLy", "LeTan"],
  },
  {
    href: "/admin/phong",
    label: "Quản lý phòng",
    icon: LayoutGrid,
    roles: ["QuanLy"],
  },
  {
    href: "/admin/buong-phong",
    label: "Buồng phòng",
    icon: Sparkles,
    roles: ["BuongPhong"],
  },
];

const ACCOUNTING_MENU = {
  baseHref: "/admin/ke-toan",
  label: "Báo cáo kế toán",
  icon: Wallet,
  roles: ["QuanLy", "KeToan"] as VaiTroNhanVien[],
  items: [
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
  ] as AccountingNavItem[],
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [isAccountingOpen, setIsAccountingOpen] = useState(false);
  const roleNavItems = NAV_ITEMS.filter((item) =>
    user?.vaiTro ? item.roles.includes(user.vaiTro) : false,
  );
  const canAccessAccountingMenu = user?.vaiTro
    ? ACCOUNTING_MENU.roles.includes(user.vaiTro)
    : false;
  const accountingNavItems = canAccessAccountingMenu
    ? ACCOUNTING_MENU.items
    : [];
  const allowedPaths = [
    ...roleNavItems.map((item) => item.href),
    ...(canAccessAccountingMenu
      ? [
          ACCOUNTING_MENU.baseHref,
          ...accountingNavItems.map((item) => item.href),
        ]
      : []),
  ];

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const hasAccess = allowedPaths.some(
        (href) => pathname === href || pathname.startsWith(`${href}/`),
      );

      if (!hasAccess) {
        router.replace(allowedPaths[0] ?? "/");
      }
    }
  }, [allowedPaths, isAuthenticated, isLoading, pathname, router, user]);

  useEffect(() => {
    if (pathname.startsWith(ACCOUNTING_MENU.baseHref)) {
      setIsAccountingOpen(true);
    }
  }, [pathname]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      <aside className="w-full lg:w-72 lg:shrink-0">
        <div className="sticky top-4 space-y-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-800 p-4 text-white">
            <div className="flex items-center gap-3">
              <UserCircle className="h-10 w-10 shrink-0 text-cyan-300" />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">
                  {user?.hoTen}
                </p>
                <span
                  className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    user
                      ? (ROLE_BADGE_CLASS[user.vaiTro as VaiTroNhanVien] ??
                        "bg-gray-100 text-gray-600")
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <ShieldCheck className="h-3 w-3" />
                  {user
                    ? (ROLE_LABEL[user.vaiTro as VaiTroNhanVien] ?? user.vaiTro)
                    : "Nhân viên"}
                </span>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-200">
              Giao diện tự điều chỉnh theo quyền được cấp để tránh thao tác sai
              vai trò.
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
              Menu nghiệp vụ
            </p>
            <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {roleNavItems.map(({ href, label, icon: Icon }) => {
                const isActive =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors ${
                      isActive
                        ? "bg-cyan-50 font-semibold text-cyan-700"
                        : "text-gray-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}

              {canAccessAccountingMenu ? (
                <div className="sm:col-span-2 lg:col-span-1">
                  <button
                    type="button"
                    onClick={() => setIsAccountingOpen((prev) => !prev)}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition-colors ${
                      pathname.startsWith(ACCOUNTING_MENU.baseHref)
                        ? "bg-cyan-50 font-semibold text-cyan-700"
                        : "text-gray-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <ACCOUNTING_MENU.icon className="h-4 w-4" />
                      {ACCOUNTING_MENU.label}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        isAccountingOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isAccountingOpen ? (
                    <div className="mt-2 grid gap-2 pl-2">
                      {accountingNavItems.map(({ href, label, icon: Icon }) => {
                        const isActive =
                          pathname === href || pathname.startsWith(`${href}/`);
                        return (
                          <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                              isActive
                                ? "bg-cyan-50 font-semibold text-cyan-700"
                                : "text-gray-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            {label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </nav>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
