"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, CalendarDays, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppToast } from "@/hooks/useAppToast";
import { getMyBookings } from "@/lib/api";
import { formatDate, formatVND, TRANG_THAI_DAT_LABEL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PhieuDatPhong } from "@/types";

export default function MyBookingPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { error } = useAppToast();

  const [rows, setRows] = useState<PhieuDatPhong[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);

  const isCustomer = user?.vaiTro === "KhachHang";

  const fetchRows = useCallback(async () => {
    setLoadingRows(true);
    try {
      const data = await getMyBookings();
      setRows(data);
    } catch (err) {
      error(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách đặt phòng.",
      );
    } finally {
      setLoadingRows(false);
    }
  }, [error]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && isCustomer) {
      void fetchRows();
    }
  }, [fetchRows, isAuthenticated, isCustomer, isLoading]);

  const upcomingCount = useMemo(
    () =>
      rows.filter(
        (row) => row.trangThai === "ChoDuyet" || row.trangThai === "DaXacNhan",
      ).length,
    [rows],
  );

  if (isLoading || (!isAuthenticated && !user)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  if (!isCustomer) {
    // Không hiển thị gì hoặc có thể chuyển hướng về trang chủ
    return null;
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-800 p-6 text-white">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">
              Tài khoản khách hàng
            </p>
            <h1 className="mt-2 text-3xl font-bold">Phòng bạn đã đặt</h1>
            <p className="mt-2 text-sm text-slate-200">
              Theo dõi tình trạng booking của bạn sau khi đặt cọc thành công.
            </p>
          </div>
          <div className="flex items-center justify-between bg-slate-50 p-6">
            <div>
              <p className="text-sm text-gray-500">Booking chờ lưu trú</p>
              <p className="text-2xl font-semibold text-slate-900">
                {upcomingCount}
              </p>
            </div>
            <Button variant="outline" className="gap-2" onClick={fetchRows}>
              <RefreshCw className="h-4 w-4" /> Làm mới
            </Button>
          </div>
        </div>
      </Card>

      {loadingRows ? (
        <div className="flex h-40 items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <p className="text-sm text-gray-500">
              Bạn chưa có booking nào gắn với tài khoản này.
            </p>
            <Link
              href="/dat-phong"
              className="inline-flex rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800"
            >
              Đặt phòng ngay
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((row) => (
            <Card key={row.maDatPhong}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-gray-500">
                    Mã đặt phòng:{" "}
                    <span className="font-semibold text-slate-900">
                      {row.maDatPhong}
                    </span>
                  </p>
                  <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-800">
                    {TRANG_THAI_DAT_LABEL[row.trangThai]}
                  </span>
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Phòng
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {row.soPhong} •{" "}
                      {row.phong?.loaiPhong?.tenLoai ?? "Loại phòng"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Nhận / trả phòng
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDate(row.ngayDen)} - {formatDate(row.ngayDi)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Tiền cọc
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatVND(Number(row.tienCoc || 0))}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Liên hệ booking
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {row.guestName}
                    </p>
                    <p className="text-xs text-gray-600">{row.guestPhone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <BedDouble className="h-3.5 w-3.5" />
                  <CalendarDays className="h-3.5 w-3.5" />
                  Thời gian đặt: {formatDate(row.thoiGianDat)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
