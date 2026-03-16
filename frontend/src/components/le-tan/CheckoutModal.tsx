"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  QrCode,
  Wallet,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/hooks/useAppToast";
import {
  checkoutGenerateQr,
  checkoutOfflinePayment,
  getCheckoutPaymentStatus,
} from "@/lib/api";
import { formatVND } from "@/lib/utils";
import type {
  CheckoutBookingResult,
  CheckoutPaymentMethod,
  HoaDon,
} from "@/types";

type CheckoutModalProps = {
  open: boolean;
  invoice: HoaDon | null;
  chiTietTinhTien: CheckoutBookingResult["chiTietTinhTien"] | null;
  onClose: () => void;
  onPaymentSuccess: (invoice: HoaDon) => void;
};

function buildQrImageSrc(rawUrl: string): string {
  if (/\.(png|jpg|jpeg|webp|svg)(\?.*)?$/i.test(rawUrl)) {
    return rawUrl;
  }
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(rawUrl)}`;
}

export default function CheckoutModal({
  open,
  invoice,
  chiTietTinhTien,
  onClose,
  onPaymentSuccess,
}: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] =
    useState<CheckoutPaymentMethod>("CASH");
  const [processingOffline, setProcessingOffline] = useState(false);
  const [creatingQr, setCreatingQr] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const { success: successToast, error: errorToast } = useAppToast();

  const intervalRef = useRef<number | null>(null);

  const amountDue = useMemo(
    () =>
      Math.max(
        0,
        Number(chiTietTinhTien?.soTienConLai ?? invoice?.tongTien ?? 0),
      ),
    [chiTietTinhTien, invoice],
  );

  const invoiceId = invoice?.maHoaDon;

  const canUseMomoQr = amountDue >= 1000;

  useEffect(() => {
    if (!open) {
      setPaymentMethod("CASH");
      setProcessingOffline(false);
      setCreatingQr(false);
      setQrCodeUrl(null);
      setPolling(false);

      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open || !polling || !invoiceId) {
      return;
    }

    const currentInvoiceId = invoiceId;

    async function checkStatus() {
      try {
        const result = await getCheckoutPaymentStatus(currentInvoiceId);
        if (result.paymentStatus === "SUCCESS") {
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setPolling(false);
          successToast("Thanh toán MoMo thành công. Hoàn tất check-out.");
          if (!invoice) return;
          onPaymentSuccess({
            ...invoice,
            paymentStatus: "SUCCESS",
            paymentMethod: "MOMO_QR",
          });
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Không thể kiểm tra trạng thái thanh toán.";
        errorToast(message, {
          id: "checkout-polling-status",
          cooldownMs: 6000,
        });
      }
    }

    checkStatus();
    intervalRef.current = window.setInterval(checkStatus, 3000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open, polling, invoice, invoiceId, onPaymentSuccess]);

  if (!open || !invoice || !chiTietTinhTien) {
    return null;
  }

  async function handleOfflineConfirm() {
    if (!["CASH", "POS"].includes(paymentMethod)) {
      errorToast("Vui lòng chọn CASH hoặc POS cho thanh toán offline.");
      return;
    }

    if (!invoiceId) {
      errorToast("Không tìm thấy invoiceId để xác nhận thanh toán offline.");
      return;
    }

    setProcessingOffline(true);

    try {
      const result = await checkoutOfflinePayment({
        invoiceId,
        paymentMethod: paymentMethod as "CASH" | "POS",
      });

      successToast("Đã ghi nhận thanh toán thành công và hoàn tất check-out.");
      onPaymentSuccess(result.invoice);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Xác nhận thanh toán offline thất bại.";
      errorToast(message);
    } finally {
      setProcessingOffline(false);
    }
  }

  async function handleGenerateQr() {
    if (!canUseMomoQr) {
      errorToast(
        "Số tiền còn lại nhỏ hơn 1.000 VNĐ, vui lòng xác nhận thanh toán offline.",
      );
      return;
    }

    if (!invoiceId) {
      errorToast("Không tìm thấy invoiceId để tạo QR thanh toán.");
      return;
    }

    setCreatingQr(true);

    try {
      const result = await checkoutGenerateQr({
        invoiceId,
      });

      const url = result.qrCodeUrl ?? result.payUrl;
      if (!url) {
        throw new Error("Không nhận được QR URL từ hệ thống.");
      }

      setQrCodeUrl(url);
      setPolling(true);
      successToast("Đã tạo QR thanh toán. Vui lòng hướng dẫn khách quét mã.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể tạo mã QR thanh toán.";
      errorToast(message);
    } finally {
      setCreatingQr(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
              Thanh toán check-out
            </p>
            <h3 className="text-xl font-bold text-slate-900">
              Chọn phương thức thanh toán phần còn lại
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Hóa đơn {invoice.maHoaDon.slice(-10).toUpperCase()} • Cần thu{" "}
              {formatVND(amountDue)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setPaymentMethod("CASH")}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              paymentMethod === "CASH"
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Wallet className="h-4 w-4" /> Tiền mặt
            </div>
            <p className="mt-1 text-xs text-slate-500">CASH</p>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod("POS")}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              paymentMethod === "POS"
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <CreditCard className="h-4 w-4" /> Quẹt thẻ POS
            </div>
            <p className="mt-1 text-xs text-slate-500">POS</p>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod("MOMO_QR")}
            disabled={!canUseMomoQr}
            className={`rounded-xl border px-3 py-3 text-left transition disabled:opacity-50 ${
              paymentMethod === "MOMO_QR"
                ? "border-cyan-500 bg-cyan-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <QrCode className="h-4 w-4" /> MoMo QR
            </div>
            <p className="mt-1 text-xs text-slate-500">MOMO_QR</p>
          </button>
        </div>

        {!canUseMomoQr && (
          <p className="mt-2 text-xs text-amber-700">
            <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
            Số tiền nhỏ hơn 1.000 VNĐ: vui lòng dùng CASH hoặc POS.
          </p>
        )}

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">
              Tiền phòng + phụ phí - tiền cọc
            </span>
            <span className="font-semibold text-slate-900">
              {formatVND(amountDue)}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Booking sẽ chuyển sang CHECKED_OUT và phòng sang NEEDS_CLEANING sau
            khi thanh toán thành công.
          </div>
        </div>

        {paymentMethod !== "MOMO_QR" ? (
          <div className="mt-5">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              loading={processingOffline}
              onClick={handleOfflineConfirm}
            >
              <CheckCircle2 className="h-4 w-4" />
              Xác nhận đã thu đủ tiền
            </Button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <Button
              className="w-full bg-cyan-700 hover:bg-cyan-800"
              loading={creatingQr}
              onClick={handleGenerateQr}
            >
              <QrCode className="h-4 w-4" />
              Tạo mã QR thanh toán
            </Button>

            {qrCodeUrl && (
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                <p className="mb-2 text-sm font-semibold text-cyan-800">
                  Quét mã để thanh toán
                </p>
                <div className="mx-auto w-fit rounded-lg bg-white p-2 shadow-sm">
                  <img
                    src={buildQrImageSrc(qrCodeUrl)}
                    alt="MoMo QR"
                    className="h-64 w-64 object-contain"
                  />
                </div>
                <p className="mt-2 text-center text-xs text-cyan-700">
                  {polling
                    ? "Đang chờ khách quét mã... Hệ thống tự kiểm tra mỗi 3 giây."
                    : "Đã dừng polling."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
