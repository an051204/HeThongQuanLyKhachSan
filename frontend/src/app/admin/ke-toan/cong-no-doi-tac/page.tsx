"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HandCoins, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useAppToast } from "@/hooks/useAppToast";
import {
  createCongNoDoiTac,
  getAccountingPartners,
  getDanhSachCongNoDoiTac,
  thuTienCongNoDoiTac,
} from "@/lib/api";
import { formatDate, formatVND } from "@/lib/utils";
import type {
  CashVoucherMethod,
  DoiTac,
  PartnerSettlement,
  PartnerSettlementStatus,
} from "@/types";

const STATUS_LABEL: Record<PartnerSettlementStatus, string> = {
  DRAFT: "Nháp",
  CONFIRMED: "Đã xác nhận",
  PARTIALLY_PAID: "Đã thu một phần",
  PAID: "Đã thu đủ",
  OVERDUE: "Quá hạn",
  CANCELLED: "Đã hủy",
};

const METHOD_LABEL: Record<CashVoucherMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  POS: "POS",
  MOMO: "MoMo",
  OTHER: "Khác",
};

export default function PartnerSettlementPage() {
  const [partners, setPartners] = useState<DoiTac[]>([]);
  const [settlements, setSettlements] = useState<PartnerSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [collectForm, setCollectForm] = useState<{
    settlementId: string;
    partnerName: string;
    maxAmount: number;
    amount: string;
    method: CashVoucherMethod;
    note: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "" | PartnerSettlementStatus
  >("");
  const { success, error } = useAppToast();

  const [form, setForm] = useState({
    idDoiTac: "",
    periodFrom: "",
    periodTo: "",
    commissionRate: "",
    dueDate: "",
    note: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [partnerData, settlementData] = await Promise.all([
        getAccountingPartners(),
        getDanhSachCongNoDoiTac({
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          page: 1,
          pageSize: 50,
        }),
      ]);
      setPartners(partnerData);
      setSettlements(settlementData.items);
    } catch (err) {
      error(
        err instanceof Error ? err.message : "Không tải được công nợ đối tác.",
      );
    } finally {
      setLoading(false);
    }
  }, [error, search, statusFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const tongConPhaiThu = useMemo(
    () =>
      settlements.reduce(
        (sum, item) => sum + Number(item.outstandingAmount),
        0,
      ),
    [settlements],
  );

  async function handleCreateSettlement() {
    if (!form.idDoiTac || !form.periodFrom || !form.periodTo) {
      error("Vui lòng chọn đối tác và khoảng thời gian.");
      return;
    }

    setSubmitting(true);
    try {
      await createCongNoDoiTac({
        idDoiTac: form.idDoiTac,
        periodFrom: form.periodFrom,
        periodTo: form.periodTo,
        commissionRate: form.commissionRate
          ? Number(form.commissionRate)
          : undefined,
        dueDate: form.dueDate || undefined,
        note: form.note || undefined,
      });
      success("Đã tạo phiên công nợ đối tác.");
      setForm({
        idDoiTac: "",
        periodFrom: "",
        periodTo: "",
        commissionRate: "",
        dueDate: "",
        note: "",
      });
      await fetchData();
    } catch (err) {
      error(
        err instanceof Error ? err.message : "Không tạo được phiên công nợ.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleCollectPayment(settlement: PartnerSettlement) {
    const maxAmount = Number(settlement.outstandingAmount);
    setCollectForm({
      settlementId: settlement.id,
      partnerName: settlement.doiTac?.tenDoiTac ?? settlement.idDoiTac,
      maxAmount,
      amount: maxAmount > 0 ? String(maxAmount) : "",
      method: "BANK_TRANSFER",
      note: "",
    });
  }

  async function handleConfirmCollectPayment() {
    if (!collectForm) return;

    const amount = Number(collectForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      error("Số tiền thu không hợp lệ.");
      return;
    }

    if (amount > collectForm.maxAmount) {
      error("Số tiền thu không được vượt quá công nợ còn lại.");
      return;
    }

    setActionId(collectForm.settlementId);
    try {
      await thuTienCongNoDoiTac(collectForm.settlementId, {
        amount,
        method: collectForm.method,
        note: collectForm.note.trim() || undefined,
      });
      success("Đã ghi nhận thu công nợ.");
      setCollectForm(null);
      await fetchData();
    } catch (err) {
      error(err instanceof Error ? err.message : "Không thu được công nợ.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <HandCoins className="h-5 w-5 text-amber-700" /> Công nợ đối tác
        </h1>
        <Button
          variant="outline"
          className="min-h-[44px] gap-2"
          onClick={fetchData}
        >
          <RefreshCw className="h-4 w-4" /> Làm mới
        </Button>
      </div>

      {collectForm ? (
        <Alert variant="default" className="flex-col items-start gap-3">
          <div>
            <p className="font-medium">Ghi nhận thu công nợ đối tác</p>
            <p className="text-xs text-blue-700">
              Đối tác: {collectForm.partnerName} • Còn phải thu:{" "}
              {formatVND(collectForm.maxAmount)}
            </p>
          </div>
          <div className="grid w-full gap-2 lg:grid-cols-[1fr_180px_1fr_auto]">
            <Input
              type="number"
              min={0}
              step="1000"
              className="min-h-[44px]"
              value={collectForm.amount}
              onChange={(e) =>
                setCollectForm((prev) =>
                  prev ? { ...prev, amount: e.target.value } : prev,
                )
              }
              placeholder="Số tiền thu"
            />
            <select
              className="min-h-[44px] rounded-md border border-slate-200 px-3 text-sm"
              value={collectForm.method}
              onChange={(e) =>
                setCollectForm((prev) =>
                  prev
                    ? {
                        ...prev,
                        method: e.target.value as CashVoucherMethod,
                      }
                    : prev,
                )
              }
            >
              {Object.entries(METHOD_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Input
              className="min-h-[44px]"
              value={collectForm.note}
              onChange={(e) =>
                setCollectForm((prev) =>
                  prev ? { ...prev, note: e.target.value } : prev,
                )
              }
              placeholder="Ghi chú thu nợ (không bắt buộc)"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="min-h-[44px] bg-emerald-600 text-sm hover:bg-emerald-700"
                loading={actionId === collectForm.settlementId}
                onClick={handleConfirmCollectPayment}
              >
                Xác nhận thu
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="min-h-[44px] text-sm"
                onClick={() => setCollectForm(null)}
              >
                Hủy
              </Button>
            </div>
          </div>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="text-base font-semibold">
              Tạo phiên đối soát công nợ
            </h2>
            <select
              className="min-h-[44px] w-full rounded-md border border-slate-200 px-3 text-sm"
              value={form.idDoiTac}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, idDoiTac: e.target.value }))
              }
            >
              <option value="">Chọn đối tác</option>
              {partners.map((partner) => (
                <option key={partner.idDoiTac} value={partner.idDoiTac}>
                  {partner.tenDoiTac} ({partner.tyLeChietKhau}%)
                </option>
              ))}
            </select>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                type="date"
                value={form.periodFrom}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, periodFrom: e.target.value }))
                }
              />
              <Input
                type="date"
                value={form.periodTo}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, periodTo: e.target.value }))
                }
              />
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="Tỷ lệ chiết khấu (%)"
                value={form.commissionRate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    commissionRate: e.target.value,
                  }))
                }
              />
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, dueDate: e.target.value }))
                }
              />
            </div>
            <Input
              placeholder="Ghi chú"
              value={form.note}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, note: e.target.value }))
              }
            />
            <Button
              className="min-h-[44px] w-full bg-amber-600 hover:bg-amber-700"
              loading={submitting}
              onClick={handleCreateSettlement}
            >
              Tạo phiên đối soát
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <Input
                placeholder="Tìm theo mã đối soát/đối tác"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-[44px]"
              />
              <select
                className="min-h-[44px] rounded-md border border-slate-200 px-3 text-sm"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "" | PartnerSettlementStatus,
                  )
                }
              >
                <option value="">Tất cả trạng thái</option>
                <option value="CONFIRMED">Đã xác nhận</option>
                <option value="PARTIALLY_PAID">Đã thu một phần</option>
                <option value="PAID">Đã thu đủ</option>
                <option value="OVERDUE">Quá hạn</option>
              </select>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              Tổng công nợ còn phải thu:{" "}
              <strong>{formatVND(tongConPhaiThu)}</strong>
            </div>

            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : settlements.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">
                Không có phiên công nợ nào.
              </div>
            ) : (
              <>
                <div className="space-y-3 lg:hidden">
                  {settlements.map((item) => (
                    <div
                      key={item.id}
                      className="space-y-3 rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {item.settlementCode}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {formatDate(item.periodFrom)} -{" "}
                            {formatDate(item.periodTo)}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {STATUS_LABEL[item.status]}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-slate-700">
                        <p>
                          <span className="font-medium">Đối tác:</span>{" "}
                          {item.doiTac?.tenDoiTac ?? item.idDoiTac}
                        </p>
                        <p>
                          <span className="font-medium">Hạn thu:</span>{" "}
                          {item.dueDate ? formatDate(item.dueDate) : "-"}
                        </p>
                        <p>
                          <span className="font-medium">Doanh thu:</span>{" "}
                          {formatVND(Number(item.grossRevenue))}
                        </p>
                        <p>
                          <span className="font-medium">Chiết khấu:</span>{" "}
                          {item.commissionRate}% (
                          {formatVND(Number(item.commissionAmount))})
                        </p>
                        <p className="font-semibold text-amber-700">
                          Còn phải thu:{" "}
                          {formatVND(Number(item.outstandingAmount))}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {item.status !== "PAID" &&
                        item.status !== "CANCELLED" ? (
                          <Button
                            className="min-h-[44px] bg-emerald-600 px-3 text-sm hover:bg-emerald-700"
                            loading={actionId === item.id}
                            onClick={() => handleCollectPayment(item)}
                          >
                            Thu tiền
                          </Button>
                        ) : (
                          <span className="inline-flex min-h-[44px] items-center text-sm text-gray-400">
                            Không có thao tác
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                        <th className="px-3 py-2">Mã đối soát</th>
                        <th className="px-3 py-2">Đối tác</th>
                        <th className="px-3 py-2">Doanh thu</th>
                        <th className="px-3 py-2">Còn phải thu</th>
                        <th className="px-3 py-2">Trạng thái</th>
                        <th className="px-3 py-2 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {settlements.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2">
                            <p className="font-medium">{item.settlementCode}</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(item.periodFrom)} -{" "}
                              {formatDate(item.periodTo)}
                            </p>
                          </td>
                          <td className="px-3 py-2">
                            <p>{item.doiTac?.tenDoiTac ?? item.idDoiTac}</p>
                            <p className="text-xs text-gray-500">
                              Due:{" "}
                              {item.dueDate ? formatDate(item.dueDate) : "-"}
                            </p>
                          </td>
                          <td className="px-3 py-2">
                            <p>{formatVND(Number(item.grossRevenue))}</p>
                            <p className="text-xs text-gray-500">
                              Chiết khấu: {item.commissionRate}% (
                              {formatVND(Number(item.commissionAmount))})
                            </p>
                          </td>
                          <td className="px-3 py-2 font-semibold text-amber-700">
                            {formatVND(Number(item.outstandingAmount))}
                          </td>
                          <td className="px-3 py-2">
                            {STATUS_LABEL[item.status]}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {item.status !== "PAID" &&
                            item.status !== "CANCELLED" ? (
                              <Button
                                size="sm"
                                className="h-7 bg-emerald-600 px-2 text-xs hover:bg-emerald-700"
                                loading={actionId === item.id}
                                onClick={() => handleCollectPayment(item)}
                              >
                                Thu tiền
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
