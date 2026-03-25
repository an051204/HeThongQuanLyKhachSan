"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles, RefreshCw, BedDouble, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAllPhong, donDepPhong } from "@/lib/api";
import { useAppToast } from "@/hooks/useAppToast";
import type { Phong } from "@/types";

export default function BuongPhongPage() {
  const [phongCanDon, setPhongCanDon] = useState<Phong[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaningRoom, setCleaningRoom] = useState<string | null>(null);
  const { success, error } = useAppToast();

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const allRooms = await getAllPhong();
      setPhongCanDon(allRooms.filter((room) => room.tinhTrang === "CanDonDep"));
    } catch (err) {
      error(
        err instanceof Error ? err.message : "Không tải được danh sách phòng.",
      );
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void fetchRooms();
  }, [fetchRooms]);

  const tangDangCanDon = useMemo(
    () =>
      Array.from(new Set(phongCanDon.map((room) => room.tang).filter(Boolean))),
    [phongCanDon],
  );
  // ...existing code...
  async function handleDanhDauSach(soPhong: string) {
    setCleaningRoom(soPhong);
    try {
      await donDepPhong(soPhong);
      await fetchRooms();
      success(`Đã đánh dấu phòng ${soPhong} đã dọn xong.`);
    } catch (err) {
      error(
        err instanceof Error
          ? err.message
          : "Không cập nhật được trạng thái phòng.",
      );
    } finally {
      setCleaningRoom(null);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-800 p-6 text-white">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">
                Buồng phòng
              </p>
              <h1 className="text-3xl font-bold">Danh sách phòng cần dọn</h1>
              <p className="max-w-xl text-sm text-slate-200">
                Theo dõi phòng vừa check-out, đánh dấu hoàn tất và trả lại trạng
                thái sẵn sàng đón khách.
              </p>
            </div>
          </div>

          <div className="grid gap-4 bg-slate-50 p-6 sm:grid-cols-2">
            <SummaryCard
              icon={<Sparkles className="h-4 w-4 text-rose-700" />}
              label="Cần dọn"
              value={String(phongCanDon.length)}
            />
            <SummaryCard
              icon={<BedDouble className="h-4 w-4 text-cyan-700" />}
              label="Tầng có việc"
              value={String(tangDangCanDon.length)}
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Danh sách xử lý
          </h2>
          <p className="text-sm text-gray-500">
            Chỉ hiển thị các phòng đang ở trạng thái cần dọn dẹp.
          </p>
        </div>
        <Button variant="outline" onClick={fetchRooms} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Làm mới
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Phòng cần dọn dẹp ({phongCanDon.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-gray-500">Đang tải...</div>
          ) : phongCanDon.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-12 text-center text-gray-500">
              Không có phòng nào cần dọn dẹp.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {phongCanDon.map((room) => (
                <div
                  key={room.soPhong}
                  className="rounded-2xl border border-slate-200 bg-cyan-50/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Phòng
                      </p>
                      <p className="text-2xl font-bold text-cyan-900">
                        {room.soPhong}
                      </p>
                      <p className="text-sm text-gray-600">
                        {room.loaiPhong?.tenLoai ?? "Loại phòng"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Tầng {room.tang ?? "?"}
                      </p>
                    </div>
                    <Badge variant="destructive">Cần dọn</Badge>
                  </div>

                  <Button
                    className="mt-4 w-full"
                    loading={cleaningRoom === room.soPhong}
                    onClick={() => handleDanhDauSach(room.soPhong)}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Đánh dấu đã dọn
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-2">{icon}</div>
      </div>
    </div>
  );
}
