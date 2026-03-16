"use client";
// src/app/admin/dat-phong/page.tsx — Quản lý danh sách đặt phòng

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAppToast } from "@/hooks/useAppToast";
import {
  getDanhSachDatPhongPaged,
  xacNhanDatPhong,
  huyDatPhong,
} from "@/lib/api";
import { formatDate, formatVND, TRANG_THAI_DAT_LABEL } from "@/lib/utils";
import type { PhieuDatPhong, TrangThaiDat, PaginationMeta } from "@/types";

const TAB_FILTERS: { label: string; value?: TrangThaiDat }[] = [
  { label: "Tất cả" },
  { label: "Chờ duyệt", value: "ChoDuyet" },
  { label: "Đã xác nhận", value: "DaXacNhan" },
  { label: "Check-in", value: "DaCheckIn" },
  { label: "Check-out", value: "DaCheckOut" },
  { label: "Đã hủy", value: "DaHuy" },
];

const BADGE_VARIANT: Record<
  TrangThaiDat,
  "default" | "success" | "warning" | "destructive" | "outline"
> = {
  ChoDuyet: "warning",
  DaXacNhan: "default",
  DaCheckIn: "success",
  DaCheckOut: "outline",
  DaHuy: "destructive",
};

export default function QuanLyDatPhongPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [activeTab, setActiveTab] = useState<TrangThaiDat | undefined>(
    undefined,
  );
  const [danhSach, setDanhSach] = useState<PhieuDatPhong[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { success, error } = useAppToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDanhSachDatPhongPaged({
        trangThai: activeTab,
        search: search.trim() || undefined,
        page,
        pageSize: 10,
      });
      setDanhSach(data.items);
      setPagination(data.pagination);
    } catch (err) {
      error(err instanceof Error ? err.message : "Lỗi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, error, page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search]);

  async function handleXacNhan(maDatPhong: string) {
    setActionLoading(maDatPhong);
    try {
      await xacNhanDatPhong(maDatPhong);
      success(`Đã xác nhận phiếu ${maDatPhong.slice(-8).toUpperCase()}`);
      await fetchData();
    } catch (err) {
      error(err instanceof Error ? err.message : "Xác nhận thất bại.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleHuy(maDatPhong: string) {
    if (!confirm("Xác nhận hủy phiếu đặt phòng này?")) return;
    setActionLoading(maDatPhong);
    try {
      await huyDatPhong(maDatPhong);
      success(`Đã hủy phiếu ${maDatPhong.slice(-8).toUpperCase()}`);
      await fetchData();
    } catch (err) {
      error(err instanceof Error ? err.message : "Hủy thất bại.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Quản lý đặt phòng</h1>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã phiếu, phòng, khách hàng..."
            className="w-72"
          />
          <Button variant="outline" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Làm mới
          </Button>
        </div>
      </div>

      {/* Tabs lọc */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border bg-gray-50 p-1">
        {TAB_FILTERS.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setActiveTab(value)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === value
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Danh sách */}
      <Card>
        <CardContent className="space-y-3 p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 text-xs text-gray-500">
            <span>
              Trang {pagination.page}/{pagination.totalPages} • Tổng{" "}
              {pagination.totalItems} phiếu
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!pagination.hasPreviousPage || loading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Trang trước
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!pagination.hasNextPage || loading}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Trang sau
              </Button>
            </div>
          </div>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : danhSach.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              Không có phiếu đặt phòng nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Mã phiếu</th>
                    <th className="px-4 py-3">Khách hàng</th>
                    <th className="px-4 py-3">Phòng</th>
                    <th className="px-4 py-3">Ngày đến</th>
                    <th className="px-4 py-3">Ngày đi</th>
                    <th className="px-4 py-3">Tiền cọc</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {danhSach.map((phieu) => (
                    <tr key={phieu.maDatPhong} className="hover:bg-gray-50">
                      <td
                        className="max-w-[220px] px-4 py-3 font-mono text-[11px] text-gray-500"
                        title={phieu.maDatPhong}
                      >
                        <span className="break-all">{phieu.maDatPhong}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {phieu.khachHang?.hoTen ?? "—"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {phieu.khachHang?.sdt ?? ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">Phòng {phieu.soPhong}</p>
                        <p className="text-xs text-gray-400">
                          {phieu.phong?.loaiPhong?.tenLoai ?? ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">{formatDate(phieu.ngayDen)}</td>
                      <td className="px-4 py-3">{formatDate(phieu.ngayDi)}</td>
                      <td className="px-4 py-3">
                        {formatVND(Number(phieu.tienCoc))}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={BADGE_VARIANT[phieu.trangThai]}>
                          {TRANG_THAI_DAT_LABEL[phieu.trangThai]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {phieu.trangThai === "ChoDuyet" && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 gap-1 bg-green-600 px-2 text-xs hover:bg-green-700"
                                loading={actionLoading === phieu.maDatPhong}
                                onClick={() => handleXacNhan(phieu.maDatPhong)}
                              >
                                <CheckCircle className="h-3 w-3" />
                                Xác nhận
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 px-2 text-xs text-red-600 hover:bg-red-50"
                                loading={actionLoading === phieu.maDatPhong}
                                onClick={() => handleHuy(phieu.maDatPhong)}
                              >
                                <XCircle className="h-3 w-3" />
                                Hủy
                              </Button>
                            </>
                          )}
                          {phieu.trangThai === "DaXacNhan" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 px-2 text-xs text-red-600 hover:bg-red-50"
                              loading={actionLoading === phieu.maDatPhong}
                              onClick={() => handleHuy(phieu.maDatPhong)}
                            >
                              <XCircle className="h-3 w-3" />
                              Hủy
                            </Button>
                          )}
                          {(phieu.trangThai === "DaCheckOut" ||
                            phieu.trangThai === "DaHuy") && (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
