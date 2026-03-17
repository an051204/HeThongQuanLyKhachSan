"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, ReceiptText, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useAppToast } from "@/hooks/useAppToast";
import {
  createPhieuThuChi,
  getDanhSachPhieuThuChi,
  huyPhieuThuChi,
  xacNhanPhieuThuChi,
} from "@/lib/api";
import { formatDate, formatVND } from "@/lib/utils";
import type {
  CashVoucher,
  CashVoucherMethod,
  CashVoucherStatus,
  CashVoucherType,
} from "@/types";

const METHOD_LABEL: Record<CashVoucherMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  POS: "POS",
  MOMO: "MoMo",
  OTHER: "Khác",
};

const STATUS_LABEL: Record<CashVoucherStatus, string> = {
  DRAFT: "Nháp",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
};

export default function CashVoucherPage() {
  const [items, setItems] = useState<CashVoucher[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | CashVoucherType>("");
  const [statusFilter, setStatusFilter] = useState<"" | CashVoucherStatus>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [cancelVoucher, setCancelVoucher] = useState<CashVoucher | null>(null);
  const { success, error } = useAppToast();

  const [form, setForm] = useState({
    type: "THU" as CashVoucherType,
    method: "CASH" as CashVoucherMethod,
    amount: "",
    description: "",
    category: "",
    referenceNo: "",
    note: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDanhSachPhieuThuChi({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
        page: 1,
        pageSize: 50,
      });
      setItems(result.items);
    } catch (err) {
      error(
        err instanceof Error ? err.message : "Không tải được phiếu thu/chi.",
      );
    } finally {
      setLoading(false);
    }
  }, [error, search, statusFilter, typeFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const tongThu = useMemo(
    () =>
      items
        .filter((item) => item.type === "THU" && item.status === "CONFIRMED")
        .reduce((sum, item) => sum + Number(item.amount), 0),
    [items],
  );

  const tongChi = useMemo(
    () =>
      items
        .filter((item) => item.type === "CHI" && item.status === "CONFIRMED")
        .reduce((sum, item) => sum + Number(item.amount), 0),
    [items],
  );

  async function handleCreateVoucher() {
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      error("Số tiền phải lớn hơn 0.");
      return;
    }

    if (!form.description.trim()) {
      error("Mô tả chứng từ là bắt buộc.");
      return;
    }

    setSubmitting(true);
    try {
      await createPhieuThuChi({
        type: form.type,
        method: form.method,
        amount,
        description: form.description,
        category: form.category || undefined,
        referenceNo: form.referenceNo || undefined,
        note: form.note || undefined,
      });
      success("Đã tạo phiếu thành công.");
      setForm({
        type: "THU",
        method: "CASH",
        amount: "",
        description: "",
        category: "",
        referenceNo: "",
        note: "",
      });
      await fetchData();
    } catch (err) {
      error(err instanceof Error ? err.message : "Không tạo được phiếu.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmVoucher(id: string) {
    setActionId(`confirm:${id}`);
    try {
      await xacNhanPhieuThuChi(id);
      success("Đã xác nhận phiếu.");
      await fetchData();
    } catch (err) {
      error(err instanceof Error ? err.message : "Không xác nhận được phiếu.");
    } finally {
      setActionId(null);
    }
  }

  function handleCancelVoucher(id: string) {
    const selectedVoucher = items.find((item) => item.id === id);
    if (!selectedVoucher) {
      error("Không tìm thấy phiếu cần hủy.");
      return;
    }

    setCancelVoucher(selectedVoucher);
  }

  async function handleConfirmCancelVoucher() {
    if (!cancelVoucher) return;

    setActionId(`cancel:${cancelVoucher.id}`);
    try {
      await huyPhieuThuChi(cancelVoucher.id);
      success("Đã hủy phiếu.");
      setCancelVoucher(null);
      await fetchData();
    } catch (err) {
      error(err instanceof Error ? err.message : "Không hủy được phiếu.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <ReceiptText className="h-5 w-5 text-indigo-700" /> Quản lý phiếu
          thu/chi
        </h1>
        <Button variant="outline" className="gap-2" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" /> Làm mới
        </Button>
      </div>

      {cancelVoucher ? (
        <Alert variant="destructive" className="flex-col items-start gap-3">
          <div>
            <p className="font-medium">
              Xác nhận hủy phiếu {cancelVoucher.voucherNo}?
            </p>
            <p className="text-xs text-red-700">
              Sau khi hủy, phiếu sẽ chuyển trạng thái Đã hủy và không thể xác
              nhận lại.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-700"
              loading={actionId === `cancel:${cancelVoucher.id}`}
              onClick={handleConfirmCancelVoucher}
            >
              Xác nhận hủy
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCancelVoucher(null)}
            >
              Bỏ qua
            </Button>
          </div>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="text-base font-semibold">Tạo phiếu mới</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="h-10 rounded-md border border-slate-200 px-3 text-sm"
                value={form.type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    type: e.target.value as CashVoucherType,
                  }))
                }
              >
                <option value="THU">Phiếu thu</option>
                <option value="CHI">Phiếu chi</option>
              </select>
              <select
                className="h-10 rounded-md border border-slate-200 px-3 text-sm"
                value={form.method}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    method: e.target.value as CashVoucherMethod,
                  }))
                }
              >
                <option value="CASH">Tiền mặt</option>
                <option value="BANK_TRANSFER">Chuyển khoản</option>
                <option value="POS">POS</option>
                <option value="MOMO">MoMo</option>
                <option value="OTHER">Khác</option>
              </select>
              <Input
                type="number"
                min={0}
                placeholder="Số tiền"
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
              <Input
                placeholder="Danh mục (ví dụ: Chi vận hành)"
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value }))
                }
              />
            </div>
            <Input
              placeholder="Mô tả chứng từ"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
            <Input
              placeholder="Mã tham chiếu (nếu có)"
              value={form.referenceNo}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, referenceNo: e.target.value }))
              }
            />
            <Input
              placeholder="Ghi chú"
              value={form.note}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, note: e.target.value }))
              }
            />
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              loading={submitting}
              onClick={handleCreateVoucher}
            >
              Tạo phiếu thu/chi
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Tìm kiếm theo mã/mô tả"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="h-10 rounded-md border border-slate-200 px-3 text-sm"
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as "" | CashVoucherType)
                }
              >
                <option value="">Tất cả loại</option>
                <option value="THU">Phiếu thu</option>
                <option value="CHI">Phiếu chi</option>
              </select>
              <select
                className="h-10 rounded-md border border-slate-200 px-3 text-sm"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "" | CashVoucherStatus)
                }
              >
                <option value="">Tất cả trạng thái</option>
                <option value="DRAFT">Nháp</option>
                <option value="CONFIRMED">Đã xác nhận</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>

            <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm md:grid-cols-3">
              <p>
                Thu xác nhận:{" "}
                <strong className="text-emerald-700">
                  {formatVND(tongThu)}
                </strong>
              </p>
              <p>
                Chi xác nhận:{" "}
                <strong className="text-rose-700">{formatVND(tongChi)}</strong>
              </p>
              <p>
                Dòng tiền ròng: <strong>{formatVND(tongThu - tongChi)}</strong>
              </p>
            </div>

            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">
                Không có chứng từ nào.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2">Mã phiếu</th>
                      <th className="px-3 py-2">Loại</th>
                      <th className="px-3 py-2">Số tiền</th>
                      <th className="px-3 py-2">Phương thức</th>
                      <th className="px-3 py-2">Ngày</th>
                      <th className="px-3 py-2">Trạng thái</th>
                      <th className="px-3 py-2 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((voucher) => (
                      <tr key={voucher.id}>
                        <td className="px-3 py-2">
                          <p className="font-medium">{voucher.voucherNo}</p>
                          <p className="text-xs text-gray-500">
                            {voucher.description}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              voucher.type === "THU"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {voucher.type === "THU" ? "Thu" : "Chi"}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-semibold">
                          {formatVND(Number(voucher.amount))}
                        </td>
                        <td className="px-3 py-2">
                          {METHOD_LABEL[voucher.method]}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {formatDate(voucher.occurredAt)}
                        </td>
                        <td className="px-3 py-2">
                          {STATUS_LABEL[voucher.status]}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {voucher.status === "DRAFT" ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                className="h-7 gap-1 bg-emerald-600 px-2 text-xs hover:bg-emerald-700"
                                loading={actionId === `confirm:${voucher.id}`}
                                onClick={() => handleConfirmVoucher(voucher.id)}
                              >
                                <CheckCircle2 className="h-3 w-3" /> Xác nhận
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 border-rose-200 px-2 text-xs text-rose-700 hover:bg-rose-50"
                                loading={actionId === `cancel:${voucher.id}`}
                                onClick={() => handleCancelVoucher(voucher.id)}
                              >
                                <XCircle className="h-3 w-3" /> Hủy
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
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
    </div>
  );
}
