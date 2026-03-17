"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, RefreshCw, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useAppToast } from "@/hooks/useAppToast";
import {
  dongCaThuNgan,
  getCaThuNganHienTai,
  getDanhSachCaThuNgan,
  moCaThuNgan,
} from "@/lib/api";
import { formatDate, formatVND } from "@/lib/utils";
import type { CashShift, PaginatedResult } from "@/types";

export default function CashShiftPage() {
  const [currentShift, setCurrentShift] = useState<CashShift | null>(null);
  const [history, setHistory] = useState<PaginatedResult<CashShift>>({
    items: [],
    pagination: {
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    },
  });
  const [openingCash, setOpeningCash] = useState("0");
  const [actualCash, setActualCash] = useState("");
  const [confirmCloseShift, setConfirmCloseShift] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useAppToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [current, shifts] = await Promise.all([
        getCaThuNganHienTai(),
        getDanhSachCaThuNgan({ page: 1, pageSize: 10 }),
      ]);
      setCurrentShift(current);
      if (!current) {
        setConfirmCloseShift(false);
      }
      setHistory(shifts);
    } catch (err) {
      error(err instanceof Error ? err.message : "Không tải được dữ liệu ca.");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const expectedCash = useMemo(
    () => currentShift?.summary?.expected ?? 0,
    [currentShift],
  );

  async function handleOpenShift() {
    const value = Number(openingCash);
    if (!Number.isFinite(value) || value < 0) {
      error("Tiền đầu ca phải là số không âm.");
      return;
    }

    setSubmitting(true);
    try {
      await moCaThuNgan({ openingCash: value });
      success("Mở ca thành công.");
      setConfirmCloseShift(false);
      setOpeningCash("0");
      await fetchData();
    } catch (err) {
      error(err instanceof Error ? err.message : "Không mở được ca.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCloseShift() {
    if (!currentShift) return;

    const value = Number(actualCash);
    if (!Number.isFinite(value) || value < 0) {
      error("Tiền thực thu cuối ca phải là số không âm.");
      return;
    }

    setConfirmCloseShift(true);
  }

  async function handleConfirmCloseShift() {
    if (!currentShift) return;

    const value = Number(actualCash);
    if (!Number.isFinite(value) || value < 0) {
      error("Tiền thực thu cuối ca phải là số không âm.");
      return;
    }

    setSubmitting(true);
    try {
      await dongCaThuNgan(currentShift.id, { actualCash: value });
      success("Đóng ca thành công.");
      setActualCash("");
      setConfirmCloseShift(false);
      await fetchData();
    } catch (err) {
      error(err instanceof Error ? err.message : "Không đóng được ca.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Clock3 className="h-5 w-5 text-cyan-700" /> Đối soát ca thu ngân
        </h1>
        <Button variant="outline" className="gap-2" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" /> Làm mới
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ca hiện tại</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {currentShift ? (
              <>
                <p>
                  Mở lúc: <strong>{formatDate(currentShift.openedAt)}</strong>
                </p>
                <p>Người mở: {currentShift.openedBy?.hoTen ?? "-"}</p>
                <p>
                  Tiền đầu ca: {formatVND(Number(currentShift.openingCash))}
                </p>
                <p>
                  Thu tiền mặt hóa đơn:{" "}
                  {formatVND(currentShift.summary?.cashFromInvoices ?? 0)}
                </p>
                <p>
                  Thu tiền mặt nội bộ:{" "}
                  {formatVND(currentShift.summary?.thuVoucher ?? 0)}
                </p>
                <p>
                  Chi tiền mặt nội bộ:{" "}
                  {formatVND(currentShift.summary?.chiVoucher ?? 0)}
                </p>
                <p className="font-semibold text-emerald-700">
                  Tiền dự kiến cuối ca: {formatVND(expectedCash)}
                </p>

                {confirmCloseShift ? (
                  <Alert
                    variant="default"
                    className="flex-col items-start gap-3"
                  >
                    <div>
                      <p className="font-medium">Xác nhận đóng ca thu ngân?</p>
                      <p className="text-xs text-blue-700">
                        Tiền thực thu nhập vào:{" "}
                        {formatVND(Number(actualCash || 0))}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        loading={submitting}
                        onClick={handleConfirmCloseShift}
                      >
                        Xác nhận đóng ca
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmCloseShift(false)}
                      >
                        Hủy
                      </Button>
                    </div>
                  </Alert>
                ) : null}

                <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center">
                  <Input
                    type="number"
                    min={0}
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    placeholder="Nhập tiền thực thu cuối ca"
                  />
                  <Button
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                    loading={submitting}
                    onClick={handleCloseShift}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Đóng ca
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-500">Chưa có ca đang mở.</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    type="number"
                    min={0}
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    placeholder="Nhập tiền đầu ca"
                  />
                  <Button
                    className="gap-2 bg-cyan-600 hover:bg-cyan-700"
                    loading={submitting}
                    onClick={handleOpenShift}
                  >
                    <Wallet className="h-4 w-4" /> Mở ca
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lịch sử ca gần đây</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.items.length === 0 ? (
              <p className="text-sm text-gray-500">
                Chưa có dữ liệu ca thu ngân.
              </p>
            ) : (
              history.items.map((shift) => (
                <div
                  key={shift.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      {shift.status === "OPEN" ? "Đang mở" : "Đã đóng"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(shift.openedAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Đầu ca: {formatVND(Number(shift.openingCash))}
                    {shift.status === "CLOSED"
                      ? ` • Cuối ca: ${formatVND(Number(shift.actualCash ?? 0))} • Chênh lệch: ${formatVND(Number(shift.variance ?? 0))}`
                      : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
