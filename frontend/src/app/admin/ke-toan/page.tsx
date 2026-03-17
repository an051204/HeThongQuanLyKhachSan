"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Landmark,
  RefreshCw,
  Wallet,
  ReceiptText,
  HandCoins,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/hooks/useAppToast";
import { getAccountingOverview } from "@/lib/api";
import { formatDate, formatVND } from "@/lib/utils";
import type { AccountingOverview } from "@/types";

export default function KeToanDashboardPage() {
  const [overview, setOverview] = useState<AccountingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const { error } = useAppToast();

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAccountingOverview();
      setOverview(result);
    } catch (err) {
      error(
        err instanceof Error
          ? err.message
          : "Không tải được dashboard kế toán.",
      );
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-gradient-to-br from-slate-900 via-emerald-900 to-cyan-800 p-6 text-white">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">
              Accounting Hub
            </p>
            <h1 className="mt-2 text-3xl font-bold">Bảng điều hành kế toán</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-200">
              Theo dõi thu chi nội bộ, ca thu ngân và công nợ đối tác trên cùng
              một màn hình.
            </p>
          </div>
          <div className="flex items-center justify-end bg-slate-50 p-6">
            <Button variant="outline" onClick={fetchOverview} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Làm mới số liệu
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Wallet className="h-5 w-5 text-emerald-700" />}
          label="Thu tháng này"
          value={formatVND(overview?.thuChiThangNay.tongThu ?? 0)}
          detail={`Chi: ${formatVND(overview?.thuChiThangNay.tongChi ?? 0)}`}
        />
        <MetricCard
          icon={<Landmark className="h-5 w-5 text-cyan-700" />}
          label="Dòng tiền ròng"
          value={formatVND(overview?.thuChiThangNay.dongTienRong ?? 0)}
          detail="Theo phiếu thu/chi đã xác nhận"
        />
        <MetricCard
          icon={<HandCoins className="h-5 w-5 text-amber-700" />}
          label="Công nợ đối tác"
          value={formatVND(overview?.congNoDoiTac.tongConPhaiThu ?? 0)}
          detail={`${overview?.congNoDoiTac.soPhienDangTheoDoi ?? 0} phiên đang theo dõi`}
        />
        <MetricCard
          icon={<ReceiptText className="h-5 w-5 text-blue-700" />}
          label="Hóa đơn cần thu"
          value={String(overview?.hoaDonChoThu.soHoaDon ?? 0)}
          detail={formatVND(overview?.hoaDonChoThu.tongTien ?? 0)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trạng thái ca thu ngân</CardTitle>
          </CardHeader>
          <CardContent>
            {overview?.caDangMo ? (
              <div className="space-y-2 text-sm">
                <p>
                  Ca đang mở từ{" "}
                  <strong>{formatDate(overview.caDangMo.openedAt)}</strong>
                </p>
                <p>Người mở ca: {overview.caDangMo.openedBy.hoTen}</p>
                <p>Tiền đầu ca: {formatVND(overview.caDangMo.openingCash)}</p>
                <p>
                  Thu tiền mặt hóa đơn:{" "}
                  {formatVND(overview.caDangMo.cashFromInvoices)}
                </p>
                <p>
                  Thu tiền mặt nội bộ: {formatVND(overview.caDangMo.thuVoucher)}
                </p>
                <p>
                  Chi tiền mặt nội bộ: {formatVND(overview.caDangMo.chiVoucher)}
                </p>
                <p className="font-semibold text-emerald-700">
                  Tiền dự kiến cuối ca: {formatVND(overview.caDangMo.expected)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Hiện không có ca nào đang mở.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lối tắt nghiệp vụ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <QuickLink
              href="/admin/ke-toan/ca-doi-soat"
              title="Đối soát ca thu ngân"
              subtitle="Mở ca, đóng ca và theo dõi chênh lệch"
            />
            <QuickLink
              href="/admin/ke-toan/phieu-thu-chi"
              title="Phiếu thu/chi"
              subtitle="Tạo chứng từ thu chi nội bộ"
            />
            <QuickLink
              href="/admin/ke-toan/cong-no-doi-tac"
              title="Công nợ đối tác"
              subtitle="Lập đối soát và ghi nhận thu nợ"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{label}</span>
          {icon}
        </div>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-gray-500">{detail}</p>
      </CardContent>
    </Card>
  );
}

function QuickLink({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-cyan-300 hover:bg-cyan-50"
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </Link>
  );
}
