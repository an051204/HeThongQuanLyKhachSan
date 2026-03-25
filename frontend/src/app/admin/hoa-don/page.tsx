"use client";
// src/app/admin/hoa-don/page.tsx — Quản lý hóa đơn

import { useEffect, useState, useCallback } from "react";
import { Receipt, CheckCircle, RefreshCw, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useAppToast } from "@/hooks/useAppToast";
import {
  getDanhSachHoaDonPaged,
  thanhToanHoaDon,
  xuatHoaDonHtml,
  xuatHoaDonPdf,
} from "@/lib/api";
import { formatDate, formatVND } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { HoaDon, TrangThaiHoaDon, PaginationMeta } from "@/types";

const TRANG_THAI_HOA_DON: Record<TrangThaiHoaDon, string> = {
  ChuaThanhToan: "Chưa thanh toán",
  DaThanhToan: "Đã thanh toán",
  DaHuy: "Đã hủy",
};

const BADGE_VARIANT: Record<
  TrangThaiHoaDon,
  "warning" | "success" | "destructive"
> = {
  ChuaThanhToan: "warning",
  DaThanhToan: "success",
  DaHuy: "destructive",
};

const TABS: { label: string; value?: TrangThaiHoaDon }[] = [
  { label: "Tất cả" },
  { label: "Chưa thanh toán", value: "ChuaThanhToan" },
  { label: "Đã thanh toán", value: "DaThanhToan" },
];

const PHUONG_THUC_LABEL: Record<string, string> = {
  TienMat: "Tiền mặt",
  ChuyenKhoan: "Chuyển khoản",
};

export default function QuanLyHoaDonPage() {
  const { user } = useAuth();
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
  const [activeTab, setActiveTab] = useState<TrangThaiHoaDon | undefined>(
    undefined,
  );
  const [hoaDonList, setHoaDonList] = useState<HoaDon[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { success, error } = useAppToast();
  const coQuyenThuTienMat =
    user?.vaiTro === "KeToan" || user?.vaiTro === "QuanLy";
  const laLeTan = user?.vaiTro === "LeTan";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDanhSachHoaDonPaged({
        trangThai: activeTab,
        search: search.trim() || undefined,
        page,
        pageSize: 10,
      });
      setHoaDonList(data.items);
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

  async function handleThuTienMat(maHoaDon: string) {
    if (!confirm("Xác nhận đã thu đủ tiền mặt cho hóa đơn này?")) return;
    setActionLoading(`cash:${maHoaDon}`);
    try {
      await thanhToanHoaDon(maHoaDon, "TienMat");
      success("Đã cập nhật thanh toán tiền mặt thành công.");
      await fetchData();
    } catch (err) {
      error(err instanceof Error ? err.message : "Thu tiền mặt thất bại.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleGhiNhanChuyenKhoan(maHoaDon: string) {
    if (!confirm("Xác nhận đã nhận chuyển khoản cho hóa đơn này?")) return;
    setActionLoading(`transfer:${maHoaDon}`);
    try {
      await thanhToanHoaDon(maHoaDon, "ChuyenKhoan");
      success("Đã ghi nhận chuyển khoản thành công.");
      await fetchData();
    } catch (err) {
      error(
        err instanceof Error ? err.message : "Ghi nhận chuyển khoản thất bại.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleXuatHoaDon(
    maHoaDon: string,
    type: "pdf" | "html" = "pdf",
  ) {
    setActionLoading(`export:${maHoaDon}`);
    try {
      let blob: Blob;
      let ext: string;
      if (type === "pdf") {
        blob = await xuatHoaDonPdf(maHoaDon);
        ext = "pdf";
      } else {
        blob = await xuatHoaDonHtml(maHoaDon);
        ext = "html";
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hoa-don-${maHoaDon}.` + ext;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      success("Đã xuất hóa đơn thành công.");
    } catch (err) {
      error(err instanceof Error ? err.message : "Không xuất được hóa đơn.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Receipt className="h-5 w-5 text-purple-600" />
          Quản lý hóa đơn
        </h1>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã hóa đơn, khách hàng, phòng..."
            className="min-h-[44px] w-full sm:w-72"
          />
          <Button
            variant="outline"
            onClick={fetchData}
            className="min-h-[44px] gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Làm mới
          </Button>
        </div>
      </div>

      <Alert variant="default">
        {laLeTan
          ? "Vai trò Lễ tân: theo dõi hóa đơn và xuất chứng từ. Thao tác xác nhận đã thu tiền mặt do Kế toán hoặc Quản lý thực hiện."
          : "Vai trò Kế toán/Quản lý: đối soát công nợ và xác nhận thanh toán tiền mặt/chuyển khoản thủ công."}
      </Alert>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border bg-gray-50 p-1">
        {TABS.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setActiveTab(value)}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === value
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3 p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 text-xs text-gray-500">
            <span>
              Trang {pagination.page}/{pagination.totalPages} • Tổng{" "}
              {pagination.totalItems} hóa đơn
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="min-h-[44px] text-sm"
                disabled={!pagination.hasPreviousPage || loading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Trang trước
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="min-h-[44px] text-sm"
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
          ) : hoaDonList.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              Không có hóa đơn nào.
            </div>
          ) : (
            <>
              <div
                className="space-y-3 px-4 pb-4 lg:hidden"
                style={{
                  maxHeight: "70vh",
                  overflowY: "auto",
                  overflowX: "hidden",
                }}
              >
                {hoaDonList.map((hd) => {
                  const choCheckOut =
                    hd.trangThai === "ChuaThanhToan" &&
                    hd.phieuDatPhong?.trangThai &&
                    hd.phieuDatPhong.trangThai !== "DaCheckOut";

                  return (
                    <div
                      key={hd.maHoaDon}
                      className="space-y-3 rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="break-all font-mono text-sm text-slate-500">
                            {hd.maHoaDon}
                          </p>
                          <p className="mt-1 break-all text-sm text-slate-500">
                            Booking: {hd.maDatPhong}
                          </p>
                        </div>
                        <Badge variant={BADGE_VARIANT[hd.trangThai]}>
                          {TRANG_THAI_HOA_DON[hd.trangThai]}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                        <p>
                          <span className="font-medium">Khách:</span>{" "}
                          {hd.phieuDatPhong?.khachHang?.hoTen ?? "—"}
                        </p>
                        <p>
                          <span className="font-medium">Phòng:</span>{" "}
                          {hd.phieuDatPhong?.phong?.soPhong ?? "—"}
                        </p>
                        <p>
                          <span className="font-medium">Nhân viên:</span>{" "}
                          {hd.nhanVien?.hoTen ?? "—"}
                        </p>
                        <p>
                          <span className="font-medium">Phụ phí:</span>{" "}
                          {Number(hd.phuPhi) > 0
                            ? formatVND(Number(hd.phuPhi))
                            : "—"}
                        </p>
                        <p>
                          <span className="font-medium">Tổng tiền:</span>{" "}
                          {formatVND(Number(hd.tongTien))}
                        </p>
                        <p>
                          <span className="font-medium">Ngày:</span>{" "}
                          {formatDate(hd.ngayThanhToan)}
                        </p>
                        <p className="col-span-2">
                          <span className="font-medium">Phương thức:</span>{" "}
                          {hd.phuongThucTT
                            ? (PHUONG_THUC_LABEL[hd.phuongThucTT] ??
                              hd.phuongThucTT)
                            : "--"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {hd.trangThai === "ChuaThanhToan" ? (
                          <>
                            {coQuyenThuTienMat && (
                              <Button
                                className="min-h-[44px] gap-1 bg-green-600 px-3 text-sm hover:bg-green-700"
                                disabled={Boolean(choCheckOut)}
                                loading={
                                  actionLoading === `cash:${hd.maHoaDon}`
                                }
                                onClick={() => handleThuTienMat(hd.maHoaDon)}
                              >
                                <CheckCircle className="h-4 w-4" />
                                Thu tiền mặt
                              </Button>
                            )}
                            {coQuyenThuTienMat && (
                              <Button
                                variant="outline"
                                className="min-h-[44px] gap-1 border-blue-200 px-3 text-sm text-blue-700 hover:bg-blue-50"
                                disabled={Boolean(choCheckOut)}
                                loading={
                                  actionLoading === `transfer:${hd.maHoaDon}`
                                }
                                onClick={() =>
                                  handleGhiNhanChuyenKhoan(hd.maHoaDon)
                                }
                              >
                                Ghi nhận CK
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              className="min-h-[44px] gap-1 px-3 text-sm"
                              loading={
                                actionLoading === `export:${hd.maHoaDon}`
                              }
                              onClick={() =>
                                handleXuatHoaDon(hd.maHoaDon, "pdf")
                              }
                            >
                              <Download className="h-4 w-4" />
                              Xuất PDF
                            </Button>
                            <Button
                              variant="ghost"
                              className="min-h-[44px] gap-1 px-3 text-sm"
                              loading={
                                actionLoading === `export:${hd.maHoaDon}`
                              }
                              onClick={() =>
                                handleXuatHoaDon(hd.maHoaDon, "html")
                              }
                            >
                              <Download className="h-4 w-4" />
                              Xuất HTML
                            </Button>
                            {choCheckOut && (
                              <span className="inline-flex min-h-[44px] items-center text-sm text-amber-600">
                                Chờ check-out
                              </span>
                            )}
                            {laLeTan && !choCheckOut && (
                              <span className="inline-flex min-h-[44px] items-center text-sm text-blue-600">
                                Kế toán chốt thu tiền mặt
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              className="min-h-[44px] gap-1 px-3 text-sm"
                              loading={
                                actionLoading === `export:${hd.maHoaDon}`
                              }
                              onClick={() =>
                                handleXuatHoaDon(hd.maHoaDon, "pdf")
                              }
                            >
                              <Download className="h-4 w-4" />
                              Xuất PDF
                            </Button>
                            <Button
                              variant="ghost"
                              className="min-h-[44px] gap-1 px-3 text-sm"
                              loading={
                                actionLoading === `export:${hd.maHoaDon}`
                              }
                              onClick={() =>
                                handleXuatHoaDon(hd.maHoaDon, "html")
                              }
                            >
                              <Download className="h-4 w-4" />
                              Xuất HTML
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className="hidden lg:block"
                style={{
                  maxHeight: "70vh",
                  overflowY: "auto",
                  overflowX: "hidden",
                }}
              >
                <table
                  className="w-full text-sm"
                  style={{ tableLayout: "fixed", wordBreak: "break-word" }}
                >
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Mã hóa đơn</th>
                      <th className="px-4 py-3">Khách hàng</th>
                      <th className="px-4 py-3">Phòng</th>
                      <th className="px-4 py-3">Nhân viên</th>
                      <th className="px-4 py-3">Phụ phí</th>
                      <th className="px-4 py-3">Tổng tiền</th>
                      <th className="px-4 py-3">Ngày</th>
                      <th className="px-4 py-3">Phương thức</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {hoaDonList.map((hd) => {
                      const choCheckOut =
                        hd.trangThai === "ChuaThanhToan" &&
                        hd.phieuDatPhong?.trangThai &&
                        hd.phieuDatPhong.trangThai !== "DaCheckOut";

                      return (
                        <tr key={hd.maHoaDon} className="hover:bg-gray-50">
                          <td
                            className="max-w-[220px] px-4 py-3 font-mono text-[11px] text-gray-500"
                            title={hd.maHoaDon}
                          >
                            <p className="break-all">{hd.maHoaDon}</p>
                            <p className="mt-1 break-all text-[10px] text-gray-400">
                              {hd.maDatPhong}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">
                              {hd.phieuDatPhong?.khachHang?.hoTen ?? "—"}
                            </p>
                            <p className="text-xs text-gray-400">
                              {hd.phieuDatPhong?.khachHang?.email ?? ""}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p>
                              Phòng {hd.phieuDatPhong?.phong?.soPhong ?? "—"}
                            </p>
                            <p className="text-xs text-gray-400">
                              {hd.phieuDatPhong?.phong?.loaiPhong?.tenLoai ??
                                ""}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {hd.nhanVien?.hoTen ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            {Number(hd.phuPhi) > 0
                              ? formatVND(Number(hd.phuPhi))
                              : "—"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-blue-700">
                            {formatVND(Number(hd.tongTien))}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {formatDate(hd.ngayThanhToan)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {hd.phuongThucTT
                              ? (PHUONG_THUC_LABEL[hd.phuongThucTT] ??
                                hd.phuongThucTT)
                              : "--"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={BADGE_VARIANT[hd.trangThai]}>
                              {TRANG_THAI_HOA_DON[hd.trangThai]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {hd.trangThai === "ChuaThanhToan" ? (
                              <div className="flex justify-end gap-1">
                                {coQuyenThuTienMat && (
                                  <Button
                                    size="sm"
                                    className="h-7 gap-1 bg-green-600 px-2 text-xs hover:bg-green-700"
                                    disabled={Boolean(choCheckOut)}
                                    loading={
                                      actionLoading === `cash:${hd.maHoaDon}`
                                    }
                                    onClick={() =>
                                      handleThuTienMat(hd.maHoaDon)
                                    }
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    Thu tiền mặt
                                  </Button>
                                )}
                                {coQuyenThuTienMat && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 gap-1 border-blue-200 px-2 text-xs text-blue-700 hover:bg-blue-50"
                                    disabled={Boolean(choCheckOut)}
                                    loading={
                                      actionLoading ===
                                      `transfer:${hd.maHoaDon}`
                                    }
                                    onClick={() =>
                                      handleGhiNhanChuyenKhoan(hd.maHoaDon)
                                    }
                                  >
                                    Ghi nhận CK
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 px-2 text-xs"
                                  loading={
                                    actionLoading === `export:${hd.maHoaDon}`
                                  }
                                  onClick={() => handleXuatHoaDon(hd.maHoaDon)}
                                >
                                  <Download className="h-3 w-3" />
                                  Xuất
                                </Button>
                                {choCheckOut && (
                                  <span className="self-center text-[11px] text-amber-600">
                                    Chờ check-out
                                  </span>
                                )}
                                {laLeTan && !choCheckOut && (
                                  <span className="self-center text-[11px] text-blue-600">
                                    Kế toán chốt thu tiền mặt
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 px-2 text-xs"
                                  loading={
                                    actionLoading === `export:${hd.maHoaDon}`
                                  }
                                  onClick={() => handleXuatHoaDon(hd.maHoaDon)}
                                >
                                  <Download className="h-3 w-3" />
                                  Xuất
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
