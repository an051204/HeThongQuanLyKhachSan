"use client";
// src/app/admin/khach-hang/page.tsx — Danh sách khách hàng

import { useEffect, useState, useCallback } from "react";
import { Users, Search, RefreshCw, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDanhSachKhachHang, deleteKhachHang } from "@/lib/api";
import { useAppToast } from "@/hooks/useAppToast";
import { formatDate } from "@/lib/utils";
import type { KhachHang } from "@/types";

export default function QuanLyKhachHangPage() {
  const [danhSach, setDanhSach] = useState<KhachHang[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { error } = useAppToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDanhSachKhachHang(query || undefined);
      setDanhSach(data);
    } catch (err) {
      error(err instanceof Error ? err.message : "Lỗi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [error, query]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(search.trim());
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa khách hàng này?")) return;
    try {
      await deleteKhachHang(id);
      fetchData();
    } catch (err) {
      error(err instanceof Error ? err.message : "Lỗi xóa khách hàng.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Users className="h-5 w-5 text-blue-600" />
          Quản lý khách hàng
        </h1>
        <Button
          variant="outline"
          onClick={fetchData}
          className="min-h-[44px] gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Làm mới
        </Button>
      </div>

      {/* Tìm kiếm */}
      <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên, email, SĐT, CCCD..."
          className="min-h-[44px] w-full sm:max-w-sm"
        />
        <Button type="submit" className="min-h-[44px] gap-2">
          <Search className="h-4 w-4" /> Tìm
        </Button>
        {query && (
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            onClick={() => {
              setSearch("");
              setQuery("");
            }}
          >
            Xóa
          </Button>
        )}
      </form>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : danhSach.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              {query
                ? `Không tìm thấy khách hàng khớp với "${query}".`
                : "Chưa có khách hàng nào."}
            </div>
          ) : (
            <>
              <div className="space-y-3 px-4 pb-4 lg:hidden">
                {danhSach.map((kh) => (
                  <div
                    key={kh.idKhachHang}
                    className="space-y-2 rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {kh.hoTen}
                      </p>
                      <span className="inline-flex min-h-[24px] min-w-[24px] items-center justify-center rounded-full bg-blue-100 px-2 text-sm font-semibold text-blue-700">
                        {kh._count?.phieuDatPhong ?? 0}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-slate-700">
                      <p>
                        <span className="font-medium">SĐT:</span> {kh.sdt}
                      </p>
                      <p>
                        <span className="font-medium">Email:</span> {kh.email}
                      </p>
                      <p>
                        <span className="font-medium">CCCD/Hộ chiếu:</span>{" "}
                        <span className="font-mono">{kh.cccd_passport}</span>
                      </p>
                      <p>
                        <span className="font-medium">Địa chỉ:</span>{" "}
                        {kh.diaChi}
                      </p>
                      <p className="inline-flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {kh.createdAt ? formatDate(kh.createdAt) : "—"}
                      </p>
                    </div>
                    <div className="pt-2 text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(kh.idKhachHang)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  maxHeight: "70vh",
                  overflowY: "auto",
                  overflowX: "hidden",
                }}
              >
                <table
                  className="min-w-full divide-y divide-gray-200"
                  style={{ tableLayout: "fixed", wordBreak: "break-word" }}
                >
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Họ tên</th>
                      <th className="px-4 py-3">SĐT</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">CCCD / Hộ chiếu</th>
                      <th className="px-4 py-3">Địa chỉ</th>
                      <th className="px-4 py-3">Số đặt phòng</th>
                      <th className="px-4 py-3">Ngày đăng ký</th>
                      <th className="px-4 py-3">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {danhSach.map((kh) => (
                      <tr key={kh.idKhachHang} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{kh.hoTen}</td>
                        <td className="px-4 py-3 text-gray-600">{kh.sdt}</td>
                        <td className="px-4 py-3 text-gray-600">{kh.email}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {kh.cccd_passport}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                          {kh.diaChi}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                            {kh._count?.phieuDatPhong ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {kh.createdAt ? formatDate(kh.createdAt) : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(kh.idKhachHang)}
                          >
                            Xóa
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t px-4 py-2 text-xs text-gray-400">
                {danhSach.length} khách hàng
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
