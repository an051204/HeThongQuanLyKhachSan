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
  const [rows, setRows] = useState<any[]>([]); // tạm dùng any để lấy cả maHoaDon
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
          className="min-h-[44px] text-sm"
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
          <>
            <div className="space-y-3 lg:hidden">
              {rows.map((row) => (
                <div
                  key={`${row.bookingId}-${row.actionAt}`}
                  className="space-y-2 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {row.tenKhachHang}
                      </p>
                      <p className="text-sm text-slate-600">
                        Mã phiếu: {row.maDatPhong.slice(-8).toUpperCase()}
                      </p>
                      {row.maHoaDon && (
                        <p className="text-xs text-slate-500">
                          Mã hóa đơn: {row.maHoaDon}
                        </p>
                      )}
                    </div>
                    {row.action === "CHECK_IN" ? (
                      <Badge variant="success" className="gap-1 text-sm">
                        <LogIn className="h-4 w-4" /> Check-in
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="gap-1 text-sm">
                        <LogOut className="h-4 w-4" /> Check-out
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                    <p>
                      <span className="font-medium">Phòng:</span> {row.soPhong}
                    </p>
                    <p>
                      <span className="font-medium">Loại:</span>{" "}
                      {row.tenLoaiPhong ?? "--"}
                    </p>
                    <p className="col-span-2">
                      <span className="font-medium">Thời gian:</span>{" "}
                      {formatDateTime(row.actionAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="hidden overflow-x-auto rounded-xl border border-slate-200 lg:block"
              style={{ maxWidth: "100%", overflowX: "auto" }}
            >
              <table
                className="min-w-full text-sm"
                style={{
                  tableLayout: "fixed",
                  width: "100%",
                  wordBreak: "break-word",
                }}
              >
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Tên khách</th>
                    <th className="px-4 py-3 text-left">Mã phiếu</th>
                    <th className="px-4 py-3 text-left">Mã hóa đơn</th>
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
                      style={{ wordBreak: "break-word" }}
                    >
                      <td className="px-4 py-3 max-w-[180px] break-words">
                        <p className="font-medium text-slate-900">
                          {row.tenKhachHang}
                        </p>
                      </td>
                      <td className="px-4 py-3 max-w-[120px] break-words">
                        {row.maDatPhong}
                      </td>
                      <td className="px-4 py-3 max-w-[120px] break-words">
                        {row.maHoaDon || "--"}
                      </td>
                      <td className="px-4 py-3 max-w-[120px] break-words">
                        <p className="font-medium text-slate-900">
                          {row.soPhong}
                        </p>
                        <p className="text-xs text-slate-500">
                          {row.tenLoaiPhong ?? "--"}
                        </p>
                      </td>
                      <td className="px-4 py-3 max-w-[120px] break-words">
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
                      <td className="px-4 py-3 text-slate-700 max-w-[160px] break-words">
                        {formatDateTime(row.actionAt)}
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
  );
}
