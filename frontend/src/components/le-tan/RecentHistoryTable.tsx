"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { History, LogIn, LogOut, RefreshCw } from "lucide-react";
import { getRecentBookingHistory } from "@/lib/api";
import { useAppToast } from "@/hooks/useAppToast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BookingHistoryItem } from "@/types";

interface RecentHistoryTableProps {
  title?: string;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return date.toLocaleString("vi-VN");
}

export default function RecentHistoryTable({
  title = "Lịch sử Check-in/Check-out (30 ngày)",
}: RecentHistoryTableProps) {
  const [rows, setRows] = useState<BookingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { error } = useAppToast();
  const isFetchingRef = useRef(false);
  const lastErrorToastAtRef = useRef(0);

  const notifyErrorThrottled = useCallback(
    (message: string) => {
      const now = Date.now();
      if (now - lastErrorToastAtRef.current < 5000) {
        return;
      }

      lastErrorToastAtRef.current = now;
      error(message);
    },
    [error],
  );

  const fetchHistory = useCallback(
    async (isRefresh = false) => {
      if (isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const data = await getRecentBookingHistory();
        setRows(data);
      } catch (err) {
        notifyErrorThrottled(
          err instanceof Error
            ? err.message
            : "Không tải được lịch sử check-in/check-out.",
        );
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [notifyErrorThrottled],
  );

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-blue-600" />
          {title}
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          loading={refreshing}
          onClick={() => void fetchHistory(true)}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Làm mới
        </Button>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">
            Đang tải lịch sử gần đây...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">
            Chưa có lịch sử check-in/check-out trong 30 ngày gần nhất.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Tên khách</th>
                  <th className="px-4 py-3 text-left">Số phòng</th>
                  <th className="px-4 py-3 text-left">Hành động</th>
                  <th className="px-4 py-3 text-left">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.bookingId}-${row.actionAt}`}
                    className="border-t border-slate-100"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {row.tenKhachHang}
                      </p>
                      <p className="text-xs text-slate-500">
                        Mã: {row.maDatPhong.slice(-8).toUpperCase()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {row.soPhong}
                      </p>
                      <p className="text-xs text-slate-500">
                        {row.tenLoaiPhong ?? "--"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {row.action === "CHECK_IN" ? (
                        <Badge variant="success" className="gap-1">
                          <LogIn className="h-3.5 w-3.5" /> Check-in
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="gap-1">
                          <LogOut className="h-3.5 w-3.5" /> Check-out
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDateTime(row.actionAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
