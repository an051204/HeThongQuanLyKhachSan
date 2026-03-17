"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LogIn,
  LogOut,
  LayoutGrid,
  LayoutDashboard,
  ClipboardList,
  Receipt,
  Users,
  Sparkles,
  Wallet,
  Clock3,
  ReceiptText,
  HandCoins,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { VaiTroNhanVien } from "@/types";
import AdminResponsiveNav from "@/components/admin/AdminResponsiveNav";

type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: VaiTroNhanVien[];
};

type AccountingNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  const mobilePrimaryItems = useMemo(() => {
    const items = roleNavItems.slice(0, 2).map(({ href, label, icon }) => ({
      href,
      label,
      icon,
    }));

    if (canAccessAccountingMenu) {
      items.push({
        href: ACCOUNTING_MENU.baseHref,
        label: "Kế toán",
        icon: ACCOUNTING_MENU.icon,
      });
    } else if (roleNavItems[2]) {
      const { href, label, icon } = roleNavItems[2];
      items.push({ href, label, icon });
    }

    return items;
  }, [canAccessAccountingMenu, roleNavItems]);

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

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const roleLabel = user
    ? (ROLE_LABEL[user.vaiTro as VaiTroNhanVien] ?? user.vaiTro)
    : "Nhân viên";
  const roleBadgeClass = user
    ? (ROLE_BADGE_CLASS[user.vaiTro as VaiTroNhanVien] ??
      "bg-slate-100 text-slate-700")
    : "bg-slate-100 text-slate-700";

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      <AdminResponsiveNav
        pathname={pathname}
        userName={user?.hoTen ?? "Nhân viên"}
        userRole={user?.vaiTro as VaiTroNhanVien | undefined}
        roleLabel={roleLabel}
        roleBadgeClass={roleBadgeClass}
        mainNavItems={roleNavItems}
        accountingBaseHref={ACCOUNTING_MENU.baseHref}
        accountingLabel={ACCOUNTING_MENU.label}
        accountingIcon={ACCOUNTING_MENU.icon}
        accountingNavItems={accountingNavItems}
        canAccessAccounting={canAccessAccountingMenu}
        isAccountingOpen={isAccountingOpen}
        onToggleAccounting={() => setIsAccountingOpen((prev) => !prev)}
        onLogout={handleLogout}
        mobileMenuOpen={isMobileMenuOpen}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
        mobilePrimaryItems={mobilePrimaryItems}
      />

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
