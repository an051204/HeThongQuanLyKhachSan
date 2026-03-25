"use client";
// src/components/le-tan/frmLeTanCheckIn.tsx
// Lễ tân nhập mã đặt phòng -> xác minh -> check-in

import { useState } from "react";
import { LogIn, Search, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RecentHistoryTable from "@/components/le-tan/RecentHistoryTable";
import { checkInBookingById, getBookingById } from "@/lib/api";
import { useAppToast } from "@/hooks/useAppToast";
import { formatDate, formatVND, TRANG_THAI_DAT_LABEL } from "@/lib/utils";
import type { PhieuDatPhong } from "@/types";

export default function FrmLeTanCheckIn() {
  const [maDatPhong, setMaDatPhong] = useState("");
  const [phieu, setPhieu] = useState<PhieuDatPhong | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const { success, error: errorToast } = useAppToast();

  const isCheckInAllowed =
    phieu !== null && ["ChoDuyet", "DaXacNhan"].includes(phieu.trangThai);

  const tenLoaiPhong = phieu?.phong?.loaiPhong?.tenLoai ?? "Chưa cập nhật";

  async function handleTim(e: React.FormEvent) {
    e.preventDefault();
    setPhieu(null);

    if (!maDatPhong.trim()) {
      errorToast("Vui lòng nhập mã đặt phòng để tra cứu.");
      return;
    }

    setLoading(true);
    try {
      const data = await getBookingById(maDatPhong.trim());
      setPhieu(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không tìm thấy phiếu.";
      errorToast(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn() {
    if (!phieu) return;

    if (!isCheckInAllowed) {
      const message = "Đơn đặt phòng này đã được xử lý hoặc không hợp lệ";
      errorToast(message);
      return;
    }

    setChecking(true);
    try {
      const updated = await checkInBookingById(phieu.id ?? phieu.maDatPhong);
      setPhieu(updated);
      setMaDatPhong(updated.maDatPhong);
      success(
        `Check-in thành công! Phòng ${updated.soPhong} đã chuyển sang trạng thái đang sử dụng.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Check-in thất bại.";
      errorToast(message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 overflow-x-hidden">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-green-600" />
            Nhận phòng (Check-in)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleTim} className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="maDat">Mã đặt phòng</Label>
              <Input
                id="maDat"
                value={maDatPhong}
                onChange={(e) => setMaDatPhong(e.target.value)}
                placeholder="Nhập mã đặt phòng..."
              />
            </div>
            <Button type="submit" loading={loading} className="self-end">
              <Search className="h-4 w-4" /> Tra cứu
            </Button>
          </form>
          {phieu && (
            <div className="space-y-3 rounded-lg border border-gray-200 p-4">
              <div className="rounded-xl bg-gradient-to-r from-blue-50 via-cyan-50 to-emerald-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Thông tin phòng nhận khách
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  Phòng {phieu.soPhong} - Loại: {tenLoaiPhong}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Thông tin phiếu đặt phòng</h3>
                <Badge
                  variant={
                    phieu.trangThai === "DaXacNhan" ||
                    phieu.trangThai === "ChoDuyet"
                      ? "success"
                      : "warning"
                  }
                >
                  {TRANG_THAI_DAT_LABEL[phieu.trangThai]}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoRow
                  label="Khách hàng"
                  value={phieu.khachHang?.hoTen ?? "-"}
                />
                <InfoRow label="SĐT" value={phieu.khachHang?.sdt ?? "-"} />
                <InfoRow label="Phòng" value={phieu.soPhong} />
                <InfoRow label="Loại phòng" value={tenLoaiPhong} />
                <InfoRow label="Ngày đến" value={formatDate(phieu.ngayDen)} />
                <InfoRow label="Ngày đi" value={formatDate(phieu.ngayDi)} />
                <InfoRow
                  label="Tiền cọc"
                  value={formatVND(Number(phieu.tienCoc))}
                />
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-300"
                loading={checking}
                onClick={handleCheckIn}
                disabled={!isCheckInAllowed}
              >
                <CheckCircle className="h-4 w-4" />
                Xác nhận Check-in
              </Button>
              {!isCheckInAllowed && (
                <p className="text-xs text-red-600">
                  Nút đã bị khóa vì booking không còn ở trạng thái cho phép
                  check-in.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <RecentHistoryTable />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
