"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
  LogOut,
  Menu,
  ShieldCheck,
  UserCircle,
  X,
} from "lucide-react";
import type { VaiTroNhanVien } from "@/types";

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type AdminResponsiveNavProps = {
  pathname: string;
  userName: string;
  userRole?: VaiTroNhanVien;
  roleLabel: string;
  roleBadgeClass: string;
  mainNavItems: NavigationItem[];
  accountingBaseHref: string;
  accountingLabel: string;
  accountingIcon: LucideIcon;
  accountingNavItems: NavigationItem[];
  canAccessAccounting: boolean;
  isAccountingOpen: boolean;
  onToggleAccounting: () => void;
  onLogout: () => void;
  mobileMenuOpen: boolean;
  onOpenMobileMenu: () => void;
  onCloseMobileMenu: () => void;
  mobilePrimaryItems: NavigationItem[];
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminResponsiveNav({
  pathname,
  userName,
  userRole,
  roleLabel,
  roleBadgeClass,
  mainNavItems,
  accountingBaseHref,
  accountingLabel,
  accountingIcon: AccountingIcon,
  accountingNavItems,
  canAccessAccounting,
  isAccountingOpen,
  onToggleAccounting,
  onLogout,
  mobileMenuOpen,
  onOpenMobileMenu,
  onCloseMobileMenu,
  mobilePrimaryItems,
}: AdminResponsiveNavProps) {
  const accountingActive = isActivePath(pathname, accountingBaseHref);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [mobileMenuOpen]);

  return (
    <>
      {/* Hide admin header on mobile, only show on md+ */}
      <div className="hidden md:flex rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {userName}
            </p>
            <span
              className={`mt-1 inline-flex min-h-[28px] items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium ${
                userRole ? roleBadgeClass : "bg-slate-100 text-slate-700"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      <aside className="hidden w-full lg:block lg:w-72 lg:shrink-0">
        <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-800 p-4 text-white">
            <div className="flex items-center gap-3">
              <UserCircle className="h-10 w-10 shrink-0 text-cyan-300" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{userName}</p>
                <span
                  className={`mt-1 inline-flex min-h-[28px] items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium ${
                    userRole ? roleBadgeClass : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {roleLabel}
                </span>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-200">
              Điều hướng theo vai trò để thao tác nhanh và hạn chế sai sót
              nghiệp vụ.
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Menu nghiệp vụ
            </p>
            <nav className="grid gap-2">
              {mainNavItems.map(({ href, label, icon: Icon }) => {
                const isActive = isActivePath(pathname, href);

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex min-h-[48px] items-center gap-3 rounded-2xl px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-cyan-50 font-semibold text-cyan-700"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}

              {canAccessAccounting ? (
                <div>
                  <button
                    type="button"
                    onClick={onToggleAccounting}
                    className={`flex min-h-[48px] w-full items-center justify-between rounded-2xl px-4 py-2 text-left text-sm transition-colors ${
                      accountingActive
                        ? "bg-cyan-50 font-semibold text-cyan-700"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <AccountingIcon className="h-4 w-4" />
                      {accountingLabel}
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
                        const isActive = isActivePath(pathname, href);

                        return (
                          <Link
                            key={href}
                            href={href}
                            className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                              isActive
                                ? "bg-cyan-50 font-semibold text-cyan-700"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
            onClick={onLogout}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div
        className={`fixed inset-0 z-40 bg-slate-950/40 transition-opacity duration-200 lg:hidden ${
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onCloseMobileMenu}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[86%] max-w-sm border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menu điều hướng mobile"
      >
        <div className="flex min-h-[64px] items-center justify-between border-b border-slate-200 px-4">
          <p className="text-sm font-semibold text-slate-900">Điều hướng</p>
          <button
            type="button"
            onClick={onCloseMobileMenu}
            className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-slate-200 text-slate-700"
            aria-label="Đóng menu điều hướng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="h-full overflow-y-auto px-4 pb-24 pt-4">
          <nav className="grid gap-2">
            {mainNavItems.map(({ href, label, icon: Icon }) => {
              const isActive = isActivePath(pathname, href);

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onCloseMobileMenu}
                  className={`flex min-h-[48px] items-center gap-3 rounded-2xl px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-cyan-50 font-semibold text-cyan-700"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}

            {canAccessAccounting ? (
              <div>
                <button
                  type="button"
                  onClick={onToggleAccounting}
                  className={`flex min-h-[48px] w-full items-center justify-between rounded-2xl px-4 py-2 text-left text-sm transition-colors ${
                    accountingActive
                      ? "bg-cyan-50 font-semibold text-cyan-700"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <AccountingIcon className="h-4 w-4" />
                    {accountingLabel}
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
                      const isActive = isActivePath(pathname, href);

                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={onCloseMobileMenu}
                          className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                            isActive
                              ? "bg-cyan-50 font-semibold text-cyan-700"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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

          <button
            onClick={() => {
              onCloseMobileMenu();
              onLogout();
            }}
            className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="fixed bottom-0 left-0 w-full max-w-[100vw] bg-white border-t z-50 overflow-hidden md:hidden">
        <nav className="flex justify-around items-center w-full px-2 py-3">
          {mobilePrimaryItems.map(({ href, label, icon: Icon }) => {
            const isActive = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center min-w-[60px] rounded-xl px-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-cyan-50 text-cyan-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] sm:text-xs truncate text-center w-full">
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
