"use client";
// src/components/le-tan/frmLeTanCheckOut.tsx
// Lễ tân nhập mã booking, thêm phụ phí chi tiết và xác nhận check-out.

import { useMemo, useState } from "react";
import { LogOut, Search, Receipt, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RecentHistoryTable from "@/components/le-tan/RecentHistoryTable";
import { checkoutBooking, getBookingById } from "@/lib/api";
import { formatDate, formatVND } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAppToast } from "@/hooks/useAppToast";
import CheckoutModal from "@/components/le-tan/CheckoutModal";
import type {
  CheckoutBookingResult,
  HoaDon,
  PhieuDatPhong,
  Surcharge,
} from "@/types";

type SurchargeDraft = {
  rowId: string;
  tenDichVu: string;
  soTien: string;
  ghiChu: string;
};

function createEmptySurchargeDraft(): SurchargeDraft {
  return {
    rowId: `${Date.now()}_${Math.random()}`,
    tenDichVu: "",
    soTien: "",
    ghiChu: "",
  };
}

function getDefaultLocalDateTimeInputValue(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function FrmLeTanCheckOut() {
  const { user } = useAuth();
  const [maDatPhong, setMaDatPhong] = useState("");
  const [actualCheckOutDate, setActualCheckOutDate] = useState(
    getDefaultLocalDateTimeInputValue(),
  );
  const [surcharges, setSurcharges] = useState<SurchargeDraft[]>([
    createEmptySurchargeDraft(),
  ]);
  const [phieu, setPhieu] = useState<PhieuDatPhong | null>(null);
  const [hoaDon, setHoaDon] = useState<HoaDon | null>(null);
  const [chiTiet, setChiTiet] = useState<
    CheckoutBookingResult["chiTietTinhTien"] | null
  >(null);
  const [chiTietPhuPhi, setChiTietPhuPhi] = useState<Surcharge[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const { success: successToast, error: errorToast } = useAppToast();

  const isCheckoutAllowed = phieu?.trangThai === "DaCheckIn";

  const tongPhuPhiNhap = useMemo(
    () =>
      surcharges.reduce((sum, item) => {
        const value = Number(item.soTien);
        return Number.isFinite(value) && value > 0 ? sum + value : sum;
      }, 0),
    [surcharges],
  );

  const tinhTienTamTinh = useMemo(() => {
    if (!phieu) {
      return {
        soNgayO: 0,
        tienPhong: 0,
        tienCoc: 0,
        tongTheoCongThuc: 0,
        tongCanThu: 0,
      };
    }

    const checkIn = new Date(phieu.ngayDen);
    const checkOut = new Date(actualCheckOutDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const soNgayO = Math.max(
      1,
      Math.ceil((checkOut.getTime() - checkIn.getTime()) / msPerDay),
    );
    const tienPhong = Number(phieu.phong?.giaPhong ?? 0) * soNgayO;
    const tienCoc = Number(phieu.tienCoc ?? 0);
    const tongTheoCongThuc = tienPhong + tongPhuPhiNhap - tienCoc;
    return {
      soNgayO,
      tienPhong,
      tienCoc,
      tongTheoCongThuc,
      tongCanThu: Math.max(0, tongTheoCongThuc),
    };
  }, [actualCheckOutDate, phieu, tongPhuPhiNhap]);

  async function handleTim(e: React.FormEvent) {
    e.preventDefault();
    setPhieu(null);
    setHoaDon(null);
    setChiTiet(null);
    setChiTietPhuPhi([]);
    setPaymentModalOpen(false);
    setLoading(true);
    try {
      const data = await getBookingById(maDatPhong.trim());
      setPhieu(data);
      if (data.trangThai !== "DaCheckIn") {
        errorToast("Booking hiện không ở trạng thái cho phép check-out.");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không tìm thấy phiếu.";
      errorToast(message);
    } finally {
      setLoading(false);
    }
  }

  function handleAddSurchargeRow() {
    setSurcharges((prev) => [...prev, createEmptySurchargeDraft()]);
  }

  function handleRemoveSurchargeRow(rowId: string) {
    setSurcharges((prev) => {
      if (prev.length <= 1) {
        return [createEmptySurchargeDraft()];
      }
      return prev.filter((item) => item.rowId !== rowId);
    });
  }

  function handleSurchargeFieldChange(
    rowId: string,
    field: keyof Omit<SurchargeDraft, "rowId">,
    value: string,
  ) {
    setSurcharges((prev) =>
      prev.map((item) =>
        item.rowId === rowId ? { ...item, [field]: value } : item,
      ),
    );
  }

  async function handleCheckOut() {
    if (!phieu) return;

    if (!isCheckoutAllowed) {
      const message =
        "Đơn đặt phòng này đã được xử lý hoặc không hợp lệ cho thao tác check-out.";
      errorToast(message);
      return;
    }

    const checkoutDate = new Date(actualCheckOutDate);
    if (Number.isNaN(checkoutDate.getTime())) {
      const message = "Ngày giờ check-out thực tế không hợp lệ.";
      errorToast(message);
      return;
    }

    const normalizedSurcharges = surcharges
      .map((item) => ({
        tenDichVu: item.tenDichVu.trim(),
        soTien: Number(item.soTien),
        ghiChu: item.ghiChu.trim() || undefined,
      }))
      .filter((item) => item.tenDichVu || item.soTien > 0);

    for (const item of normalizedSurcharges) {
      if (!item.tenDichVu) {
        const message = "Mỗi phụ phí cần có tên dịch vụ.";
        errorToast(message);
        return;
      }
      if (!Number.isFinite(item.soTien) || item.soTien < 0) {
        const message = "Số tiền phụ phí phải là số không âm.";
        errorToast(message);
        return;
      }
    }

    setChecking(true);
    try {
      if (!user?.idNhanVien) {
        errorToast("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
        return;
      }

      const result = await checkoutBooking({
        bookingId: phieu.id ?? phieu.maDatPhong,
        actualCheckOutDate: checkoutDate.toISOString(),
        surcharges: normalizedSurcharges,
      });

      setHoaDon(result.invoice ?? result.hoaDon);
      setChiTiet(result.chiTietTinhTien);
      setChiTietPhuPhi(result.surcharges);
      successToast(
        "Đã chốt số tiền cuối. Vui lòng chọn phương thức thanh toán.",
      );
      setPaymentModalOpen(true);
      setSurcharges([createEmptySurchargeDraft()]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Check-out thất bại.";
      errorToast(message);
    } finally {
      setChecking(false);
    }
  }

  function handlePaymentSuccess(updatedInvoice: HoaDon) {
    setHoaDon(updatedInvoice);
    setPaymentModalOpen(false);
    setPhieu(null);
    setMaDatPhong("");
    successToast(
      "Thanh toán thành công. Booking đã check-out và phòng đã chuyển sang cần dọn dẹp.",
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 overflow-x-hidden">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-orange-600" />
            Trả phòng cho Lễ tân (letan)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleTim} className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="maDatCO">Mã đặt phòng</Label>
              <Input
                id="maDatCO"
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
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-semibold">Xác nhận trả phòng</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoRow
                  label="Khách hàng"
                  value={phieu.khachHang?.hoTen ?? "—"}
                />
                <InfoRow label="Phòng" value={phieu.soPhong} />
                <InfoRow label="Ngày đến" value={formatDate(phieu.ngayDen)} />
                <InfoRow
                  label="Ngày đi (KH)"
                  value={formatDate(phieu.ngayDi)}
                />
                <InfoRow
                  label="Tiền cọc"
                  value={formatVND(Number(phieu.tienCoc))}
                />
              </div>

              <div className="space-y-2 rounded-md border border-slate-200 p-3">
                <Label htmlFor="actualCheckOutDate">
                  Thời điểm check-out thực tế
                </Label>
                <Input
                  id="actualCheckOutDate"
                  type="datetime-local"
                  value={actualCheckOutDate}
                  onChange={(e) => setActualCheckOutDate(e.target.value)}
                />
              </div>

              <div className="space-y-2 rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Phụ phí phát sinh</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSurchargeRow}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm phụ phí
                  </Button>
                </div>

                <div className="space-y-2">
                  {surcharges.map((item) => (
                    <div
                      key={item.rowId}
                      className="grid gap-2 rounded-md border border-slate-100 p-2 md:grid-cols-12"
                    >
                      <div className="md:col-span-4">
                        <Input
                          value={item.tenDichVu}
                          placeholder="Tên dịch vụ (Minibar, giặt ủi...)"
                          onChange={(e) =>
                            handleSurchargeFieldChange(
                              item.rowId,
                              "tenDichVu",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Input
                          type="number"
                          min={0}
                          step={1000}
                          value={item.soTien}
                          placeholder="Số tiền"
                          onChange={(e) =>
                            handleSurchargeFieldChange(
                              item.rowId,
                              "soTien",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      <div className="md:col-span-4">
                        <Input
                          value={item.ghiChu}
                          placeholder="Ghi chú (không bắt buộc)"
                          onChange={(e) =>
                            handleSurchargeFieldChange(
                              item.rowId,
                              "ghiChu",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSurchargeRow(item.rowId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  Ví dụ: minibar, giặt ủi, hư hại tài sản.
                </p>
              </div>

              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm space-y-1.5">
                <HoaDonRow
                  label={`Tiền phòng tạm tính (${tinhTienTamTinh.soNgayO} đêm)`}
                  value={formatVND(tinhTienTamTinh.tienPhong)}
                />
                <HoaDonRow
                  label="Tổng phụ phí nhập"
                  value={formatVND(tongPhuPhiNhap)}
                />
                <HoaDonRow
                  label="Tiền cọc sẽ khấu trừ"
                  value={`- ${formatVND(tinhTienTamTinh.tienCoc)}`}
                />
                <hr className="border-orange-300" />
                <HoaDonRow
                  label="Tổng cần thu tạm tính"
                  value={formatVND(tinhTienTamTinh.tongCanThu)}
                  bold
                />
              </div>

              <Button
                className="w-full bg-orange-500 hover:bg-orange-600"
                loading={checking}
                onClick={handleCheckOut}
                disabled={!isCheckoutAllowed}
              >
                <Receipt className="h-4 w-4" />
                Chốt số tiền cuối
              </Button>

              {!isCheckoutAllowed && (
                <p className="text-xs text-red-600">
                  Nút đã bị khóa vì booking không còn ở trạng thái cho phép
                  check-out.
                </p>
              )}
            </div>
          )}

          {/* Hóa đơn sau khi check-out */}
          {hoaDon && chiTiet && (
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 space-y-3">
              <h3 className="flex items-center gap-2 font-semibold text-green-800">
                <Receipt className="h-4 w-4" /> Hóa đơn #
                {hoaDon.maHoaDon.slice(-8).toUpperCase()}
              </h3>
              <div className="space-y-1.5 text-sm">
                <HoaDonRow
                  label={`Tiền phòng (${chiTiet.soNgayO} đêm × ${formatVND(chiTiet.giaPhongMoiDem)})`}
                  value={formatVND(chiTiet.tienPhong)}
                />
                <HoaDonRow
                  label="Phụ phí"
                  value={formatVND(chiTiet.tongPhuPhi)}
                />
                <HoaDonRow
                  label="Tiền cọc đã trả"
                  value={`- ${formatVND(chiTiet.tienCocDaTraTruoc)}`}
                />
                <hr className="border-green-300" />
                <HoaDonRow
                  label="Tổng còn lại"
                  value={formatVND(chiTiet.soTienConLai)}
                  bold
                />
              </div>
              {chiTietPhuPhi.length > 0 && (
                <div className="rounded border border-green-200 bg-white p-2 text-sm">
                  <p className="mb-1 font-medium text-green-700">
                    Chi tiết phụ phí đã lưu
                  </p>
                  <div className="space-y-1">
                    {chiTietPhuPhi.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-2"
                      >
                        <div>
                          <p>{item.tenDichVu}</p>
                          {item.ghiChu && (
                            <p className="text-xs text-gray-500">
                              {item.ghiChu}
                            </p>
                          )}
                        </div>
                        <p className="font-medium">
                          {formatVND(Number(item.soTien))}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-green-600">
                {hoaDon.paymentStatus === "SUCCESS"
                  ? "Phòng đã chuyển sang trạng thái Cần dọn dẹp."
                  : "Đang chờ thanh toán phần còn lại để hoàn tất check-out."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <CheckoutModal
        open={paymentModalOpen}
        invoice={hoaDon}
        chiTietTinhTien={chiTiet}
        onClose={() => setPaymentModalOpen(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <RecentHistoryTable title="Đối chiếu lịch sử check-in/check-out" />
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

function HoaDonRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${bold ? "font-bold text-base" : ""}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
