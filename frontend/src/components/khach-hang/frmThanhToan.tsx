"use client";
// src/components/khach-hang/frmThanhToan.tsx
// Giao diện xác nhận thanh toán cọc trước khi tạo đơn trong hệ thống

import { useRouter } from "next/navigation";
import { Home, TimerReset, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatVND, formatDate } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { taoDatPhongVaLayLinkMoMo } from "@/lib/api";
import { useAppToast } from "@/hooks/useAppToast";
import type { BookingPaymentMethod } from "@/types";

const PENDING_BOOKING_KEY = "khachsan_pending_booking";

type PendingBooking = {
  createdAt: number;
  expiresAt: number;
  khachHang: {
    hoTen: string;
    sdt: string;
    email: string;
    cccd_passport: string;
    diaChi: string;
  };
  datPhong: {
    soPhong: string;
    loaiPhong: string;
    ngayDen: string;
    ngayDi: string;
    giaPhong: number;
    soDem: number;
    tienCoc: number;
    tongTien: number;
  };
};

export default function FrmThanhToan() {
  const router = useRouter();
  const [loadingMoMo, setLoadingMoMo] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<BookingPaymentMethod>("QR");
  const [pending, setPending] = useState<PendingBooking | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [expired, setExpired] = useState(false);
  const { error, info, warning } = useAppToast();

  useEffect(() => {
    const raw = sessionStorage.getItem(PENDING_BOOKING_KEY);
    if (!raw) {
      error("Không tìm thấy yêu cầu đặt phòng đang chờ thanh toán cọc.");
      return;
    }

    try {
      const data = JSON.parse(raw) as PendingBooking;
      if (!data?.expiresAt || Date.now() >= data.expiresAt) {
        sessionStorage.removeItem(PENDING_BOOKING_KEY);
        setExpired(true);
        warning("Yêu cầu đã hết hạn và được tự động hủy.");
        return;
      }

      setPending(data);
      setSecondsLeft(
        Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000)),
      );
    } catch {
      sessionStorage.removeItem(PENDING_BOOKING_KEY);
      error("Dữ liệu yêu cầu đặt phòng không hợp lệ. Vui lòng đặt lại.");
    }
  }, [error, warning]);

  useEffect(() => {
    if (!pending) return;

    const timer = setInterval(() => {
      const remain = Math.max(
        0,
        Math.floor((pending.expiresAt - Date.now()) / 1000),
      );
      setSecondsLeft(remain);

      if (remain <= 0) {
        clearInterval(timer);
        sessionStorage.removeItem(PENDING_BOOKING_KEY);
        setPending(null);
        setExpired(true);
        warning(
          "Quá thời gian chờ thanh toán cọc. Yêu cầu đã tự hủy và không được lưu vào hệ thống.",
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [pending, warning]);

  const countdownText = useMemo(() => {
    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const ss = String(secondsLeft % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [secondsLeft]);

  async function handleThanhToanQuaMoMoSandbox() {
    if (!pending) {
      error("Không có yêu cầu đặt phòng để thanh toán MoMo.");
      return;
    }

    setLoadingMoMo(true);

    try {
      const result = await taoDatPhongVaLayLinkMoMo({
        roomId: pending.datPhong.soPhong,
        checkInDate: pending.datPhong.ngayDen,
        checkOutDate: pending.datPhong.ngayDi,
        totalPrice: pending.datPhong.tongTien,
        customer: pending.khachHang,
        paymentMethod,
        note: `Thanh toan coc MoMo (${paymentMethod}) tu trang /thanh-toan cho phong ${pending.datPhong.soPhong}`,
      });

      if (!result.payUrl) {
        throw new Error("Không nhận được liên kết thanh toán MoMo.");
      }

      window.location.assign(result.payUrl);
    } catch (err) {
      error(
        err instanceof Error
          ? err.message
          : "Không thể tạo yêu cầu thanh toán MoMo Sandbox.",
      );
    } finally {
      setLoadingMoMo(false);
    }
  }

  function handleHuyYeuCau() {
    sessionStorage.removeItem(PENDING_BOOKING_KEY);
    setPending(null);
    setExpired(true);
    info("Yêu cầu đã được hủy và chưa ghi nhận vào hệ thống.");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Trạng thái chờ xác nhận cọc */}
      <div className="text-center">
        <WalletCards className="mx-auto h-16 w-16 text-amber-500" />
        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          Xác nhận thanh toán cọc
        </h1>
        {pending && (
          <p className="mt-1 text-gray-500">
            Hệ thống chỉ ghi nhận đơn đặt phòng vào cơ sở dữ liệu khi MoMo xác
            nhận giao dịch thành công.
          </p>
        )}
      </div>

      {!pending && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push("/")}
        >
          <Home className="h-4 w-4" />
          Quay lại đặt phòng
        </Button>
      )}

      {pending && (
        <Alert variant="default">
          <span className="inline-flex items-center gap-1">
            <TimerReset className="h-4 w-4" />
            Thời gian giữ yêu cầu: <strong>{countdownText}</strong>
          </span>
        </Alert>
      )}

      {pending && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Chi tiết yêu cầu đặt phòng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Khách hàng" value={pending.khachHang.hoTen} />
                <InfoRow label="Phòng" value={pending.datPhong.soPhong} />
                <InfoRow
                  label="Loại phòng"
                  value={pending.datPhong.loaiPhong}
                />
                <InfoRow
                  label="Ngày đến"
                  value={formatDate(pending.datPhong.ngayDen)}
                />
                <InfoRow
                  label="Ngày đi"
                  value={formatDate(pending.datPhong.ngayDi)}
                />
                <InfoRow
                  label="Số đêm"
                  value={`${pending.datPhong.soDem} đêm`}
                />
              </div>

              <hr />

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tổng tiền phòng</span>
                  <span>{formatVND(pending.datPhong.tongTien)}</span>
                </div>
                <div className="flex justify-between font-semibold text-amber-700">
                  <span>Tiền cọc cần xác nhận</span>
                  <span>{formatVND(pending.datPhong.tienCoc)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Thanh toán khi check-out</span>
                  <span>
                    {formatVND(
                      pending.datPhong.tongTien - pending.datPhong.tienCoc,
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3">
                <span className="text-sm font-medium text-amber-700">
                  Trạng thái
                </span>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  Chờ thanh toán MoMo
                </span>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      paymentMethod === "QR"
                        ? "border-rose-500 bg-rose-50 text-rose-700"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                    onClick={() => setPaymentMethod("QR")}
                    disabled={loadingMoMo}
                  >
                    QR MoMo
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      paymentMethod === "CARD"
                        ? "border-rose-500 bg-rose-50 text-rose-700"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                    onClick={() => setPaymentMethod("CARD")}
                    disabled={loadingMoMo}
                  >
                    Nhập thẻ (ATM/Visa)
                  </button>
                </div>

                <Button
                  className="w-full bg-rose-600 hover:bg-rose-700"
                  loading={loadingMoMo}
                  onClick={handleThanhToanQuaMoMoSandbox}
                  disabled={false}
                >
                  {paymentMethod === "QR"
                    ? "Thanh toán cọc bằng QR MoMo Sandbox"
                    : "Thanh toán cọc bằng nhập thẻ Sandbox"}
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                  onClick={handleHuyYeuCau}
                  disabled={loadingMoMo}
                >
                  Hủy yêu cầu
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-2 font-semibold text-gray-800">Lưu ý</h3>
              <ol className="list-inside list-decimal space-y-1.5 text-sm text-gray-600">
                <li>
                  Bạn có thể bấm nút "Thanh toán cọc qua MoMo Sandbox" để chuyển
                  sang cổng MoMo test và thanh toán trực tiếp.
                </li>
                <li>
                  Chọn "Nhập thẻ (ATM/Visa)" nếu muốn thanh toán thủ công bằng
                  thông tin thẻ thay vì quét QR.
                </li>
                <li>
                  Nếu bạn thoát giữa chừng hoặc thanh toán thất bại, hệ thống sẽ
                  không ghi nhận đơn đặt phòng vào cơ sở dữ liệu.
                </li>
                <li>
                  Nếu hết thời gian chờ mà chưa thanh toán, yêu cầu sẽ tự hủy.
                </li>
              </ol>
            </CardContent>
          </Card>
        </>
      )}

      {expired && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push("/")}
        >
          <Home className="h-4 w-4" />
          Đặt phòng lại
        </Button>
      )}
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
