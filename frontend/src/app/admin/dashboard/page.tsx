"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BedDouble,
  ClipboardCheck,
  CreditCard,
  Landmark,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RecentHistoryTable from "@/components/le-tan/RecentHistoryTable";
import { useAppToast } from "@/hooks/useAppToast";
import {
  donDepPhong,
  getAllPhong,
  getDanhSachDatPhong,
  getDanhSachHoaDon,
  getThongKeTongQuan,
} from "@/lib/api";
import {
  formatDate,
  formatVND,
  TINH_TRANG_LABEL,
  TRANG_THAI_DAT_LABEL,
} from "@/lib/utils";
import type {
  HoaDon,
  PhieuDatPhong,
  Phong,
  ThongKeTongQuan,
  VaiTroNhanVien,
} from "@/types";

const ROLE_COPY: Record<
  VaiTroNhanVien,
  { title: string; description: string }
> = {
  QuanLy: {
    title: "Bức tranh vận hành toàn khách sạn",
    description:
      "Theo dõi công suất phòng, doanh thu và các việc cần xử lý trong ngày.",
  },
  LeTan: {
    title: "Ca trực lễ tân hôm nay",
    description:
      "Tập trung vào check-in, check-out và các phiếu đặt cần xác nhận nhanh.",
  },
  KeToan: {
    title: "Tình hình thanh toán và doanh thu",
    description:
      "Ưu tiên theo dõi hóa đơn chưa thanh toán và dòng tiền trong ngày.",
  },
  BuongPhong: {
    title: "Điều phối buồng phòng",
    description:
      "Tập trung vào phòng cần dọn, phòng đã sẵn sàng và tiến độ hoàn thành.",
  },
};

function isSameDay(dateString?: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function formatShortDay(dayKey: string): string {
  const [year, month, day] = dayKey.split("-");
  if (!year || !month || !day) return dayKey;
  return `${day}/${month}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ThongKeTongQuan | null>(null);
  const [phongList, setPhongList] = useState<Phong[]>([]);
  const [bookingList, setBookingList] = useState<PhieuDatPhong[]>([]);
  const [invoiceList, setInvoiceList] = useState<HoaDon[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaningRoom, setCleaningRoom] = useState<string | null>(null);
  const { success, error } = useAppToast();

  const fetchData = useCallback(async () => {
    if (!user?.vaiTro) return;

    setLoading(true);
    try {
      if (user.vaiTro === "QuanLy") {
        const statsData = await getThongKeTongQuan();
        setStats(statsData);
        setPhongList([]);
        setBookingList([]);
        setInvoiceList([]);
        return;
      }

      if (user.vaiTro === "LeTan") {
        const [statsData, rooms, bookings] = await Promise.all([
          getThongKeTongQuan(),
          getAllPhong(),
          getDanhSachDatPhong(),
        ]);
        setStats(statsData);
        setPhongList(rooms);
        setBookingList(bookings);
        setInvoiceList([]);
        return;
      }

      if (user.vaiTro === "KeToan") {
        const [statsData, invoices] = await Promise.all([
          getThongKeTongQuan(),
          getDanhSachHoaDon(),
        ]);
        setStats(statsData);
        setPhongList([]);
        setBookingList([]);
        setInvoiceList(invoices);
        return;
      }

      const [statsData, rooms] = await Promise.all([
        getThongKeTongQuan(),
        getAllPhong(),
      ]);
      setStats(statsData);
      setPhongList(rooms);
      setBookingList([]);
      setInvoiceList([]);
    } catch (err) {
      error(err instanceof Error ? err.message : "Lỗi tải dữ liệu dashboard.");
    } finally {
      setLoading(false);
    }
  }, [error, user?.vaiTro]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const roomsNeedCleaning = useMemo(
    () => phongList.filter((room) => room.tinhTrang === "CanDonDep"),
    [phongList],
  );
  const availableRooms = useMemo(
    () => phongList.filter((room) => room.tinhTrang === "Trong"),
    [phongList],
  );
  const pendingBookings = useMemo(
    () => bookingList.filter((booking) => booking.trangThai === "ChoDuyet"),
    [bookingList],
  );
  const arrivalsToday = useMemo(
    () => bookingList.filter((booking) => isSameDay(booking.ngayDen)),
    [bookingList],
  );
  const departuresToday = useMemo(
    () => bookingList.filter((booking) => isSameDay(booking.ngayDi)),
    [bookingList],
  );
  const unpaidInvoices = useMemo(
    () =>
      invoiceList.filter((invoice) => invoice.trangThai === "ChuaThanhToan"),
    [invoiceList],
  );
  const paidInvoices = useMemo(
    () => invoiceList.filter((invoice) => invoice.trangThai === "DaThanhToan"),
    [invoiceList],
  );
  const unpaidAmount = useMemo(
    () =>
      unpaidInvoices.reduce(
        (sum, invoice) => sum + Number(invoice.tongTien),
        0,
      ),
    [unpaidInvoices],
  );

  const managerPendingBookings =
    stats?.canXuLy.phieuChoDuyet ?? pendingBookings.length;
  const managerAvailableRooms = stats?.phong.trong ?? availableRooms.length;
  const managerUnpaidInvoices =
    stats?.phanTichKeToan.hoaDon.chuaThanhToan ?? unpaidInvoices.length;
  const managerRoomsNeedCleaning =
    stats?.phong.canDonDep ?? roomsNeedCleaning.length;

  async function handleCleanRoom(soPhong: string) {
    setCleaningRoom(soPhong);
    try {
      await donDepPhong(soPhong);
      await fetchData();
      success(`Đã đánh dấu phòng ${soPhong} đã dọn.`);
    } catch (err) {
      error(err instanceof Error ? err.message : "Không cập nhật được phòng.");
    } finally {
      setCleaningRoom(null);
    }
  }

  if (!user) {
    return null;
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
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-800 p-6 text-white">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">
              Dashboard theo vai trò
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              {ROLE_COPY[user.vaiTro].title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-200">
              {ROLE_COPY[user.vaiTro].description}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 bg-slate-50 p-6">
            <div>
              <p className="text-sm text-gray-500">Vai trò hiện tại</p>
              <p className="text-xl font-semibold text-gray-900">
                {user.vaiTro}
              </p>
            </div>
            <Button variant="outline" onClick={fetchData} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Làm mới
            </Button>
          </div>
        </div>
      </Card>

      {user.vaiTro === "QuanLy" && stats && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<BedDouble className="h-5 w-5 text-cyan-700" />}
              label="Tỷ lệ lấp đầy"
              value={`${stats.phong.tyLeLapDay}%`}
              detail={`${stats.phong.dangSuDung}/${stats.phong.tong} phòng`}
            />
            <MetricCard
              icon={<TrendingUp className="h-5 w-5 text-emerald-700" />}
              label="Doanh thu hôm nay"
              value={formatVND(stats.hoatDongHomNay.doanhThu)}
              detail={`${stats.hoatDongHomNay.soHoaDon} hóa đơn`}
            />
            <MetricCard
              icon={<Users className="h-5 w-5 text-blue-700" />}
              label="Khách hàng"
              value={String(stats.tongKhachHang)}
              detail="Khách đã đăng ký"
            />
            <MetricCard
              icon={<Sparkles className="h-5 w-5 text-rose-700" />}
              label="Phòng cần dọn"
              value={String(managerRoomsNeedCleaning)}
              detail="Cần xử lý ngay"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Điểm nóng vận hành</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <StatusRow
                  label="Phiếu chờ duyệt"
                  value={managerPendingBookings}
                  tone="warning"
                />
                <StatusRow
                  label="Phòng trống sẵn sàng bán"
                  value={managerAvailableRooms}
                  tone="success"
                />
                <StatusRow
                  label="Hóa đơn chưa thanh toán"
                  value={managerUnpaidInvoices}
                  tone="default"
                />
                <StatusRow
                  label="Phòng cần dọn"
                  value={managerRoomsNeedCleaning}
                  tone="destructive"
                />
              </CardContent>
            </Card>

            <QuickLinks
              title="Truy cập nhanh"
              items={[
                {
                  href: "/admin/phong",
                  label: "Quản lý phòng",
                  note: "Điều chỉnh loại phòng, giá và gallery",
                },
                {
                  href: "/admin/dat-phong",
                  label: "Xử lý đặt phòng",
                  note: `${managerPendingBookings} phiếu chờ duyệt`,
                },
                {
                  href: "/admin/hoa-don",
                  label: "Theo dõi hóa đơn",
                  note: `${managerUnpaidInvoices} hóa đơn chưa thanh toán`,
                },
              ]}
            />
          </div>

          <RecentHistoryTable title="Lịch sử Check-in/Check-out gần đây" />
        </>
      )}

      {user.vaiTro === "LeTan" && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<ClipboardCheck className="h-5 w-5 text-amber-700" />}
              label="Phiếu chờ duyệt"
              value={String(pendingBookings.length)}
              detail="Cần xác nhận sớm"
            />
            <MetricCard
              icon={<Users className="h-5 w-5 text-emerald-700" />}
              label="Khách đến hôm nay"
              value={String(arrivalsToday.length)}
              detail="Lịch check-in trong ngày"
            />
            <MetricCard
              icon={<ArrowRight className="h-5 w-5 text-blue-700" />}
              label="Khách rời hôm nay"
              value={String(departuresToday.length)}
              detail="Chuẩn bị check-out"
            />
            <MetricCard
              icon={<BedDouble className="h-5 w-5 text-cyan-700" />}
              label="Phòng còn trống"
              value={String(availableRooms.length)}
              detail="Có thể nhận khách mới"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ListCard
              title="Lịch check-in hôm nay"
              emptyMessage="Không có lịch check-in hôm nay."
              items={arrivalsToday.slice(0, 6).map((booking) => ({
                title: booking.khachHang?.hoTen ?? booking.idKhachHang,
                subtitle: `Phòng ${booking.soPhong} • ${TRANG_THAI_DAT_LABEL[booking.trangThai]}`,
                meta: formatDate(booking.ngayDen),
              }))}
            />
            <QuickLinks
              title="Tác vụ ưu tiên"
              items={[
                {
                  href: "/admin/dat-phong",
                  label: "Xác nhận đặt phòng",
                  note: `${pendingBookings.length} phiếu đang chờ`,
                },
                {
                  href: "/admin/check-in",
                  label: "Thực hiện check-in",
                  note: `${arrivalsToday.length} khách đến trong ngày`,
                },
                {
                  href: "/admin/check-out",
                  label: "Thực hiện check-out",
                  note: `${departuresToday.length} lịch trả phòng`,
                },
              ]}
            />
          </div>

          <RecentHistoryTable title="Lịch sử đối chiếu cho lễ tân" />
        </>
      )}

      {user.vaiTro === "KeToan" && stats && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<CreditCard className="h-5 w-5 text-amber-700" />}
              label="Chưa thanh toán"
              value={String(stats.phanTichKeToan.hoaDon.chuaThanhToan)}
              detail="Hóa đơn cần thu"
            />
            <MetricCard
              icon={<Landmark className="h-5 w-5 text-emerald-700" />}
              label="Cần thu"
              value={formatVND(unpaidAmount)}
              detail="Tổng tiền còn lại"
            />
            <MetricCard
              icon={<TrendingUp className="h-5 w-5 text-blue-700" />}
              label="Doanh thu 7 ngày"
              value={formatVND(stats.phanTichKeToan.doanhThu7Ngay)}
              detail={`So với 7 ngày trước: ${stats.phanTichKeToan.tangTruong7Ngay}%`}
            />
            <MetricCard
              icon={<Landmark className="h-5 w-5 text-cyan-700" />}
              label="Doanh thu 30 ngày"
              value={formatVND(stats.phanTichKeToan.doanhThu30Ngay)}
              detail={`Tỷ lệ thu ${stats.phanTichKeToan.hoaDon.tyLeThuTien}%`}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <ListCard
              title="Hóa đơn chưa thanh toán"
              emptyMessage="Không có hóa đơn tồn đọng."
              items={unpaidInvoices.slice(0, 6).map((invoice) => ({
                title:
                  invoice.phieuDatPhong?.khachHang?.hoTen ?? invoice.maHoaDon,
                subtitle: `Phòng ${invoice.phieuDatPhong?.phong?.soPhong ?? "—"}`,
                meta: formatVND(Number(invoice.tongTien)),
              }))}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Xu hướng doanh thu 7 ngày
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.phanTichKeToan.xuHuongDoanhThu7Ngay.map((item) => (
                  <div
                    key={item.ngay}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {formatShortDay(item.ngay)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.soHoaDon} hóa đơn
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-700">
                      {formatVND(item.doanhThu)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <QuickLinks
              title="Lối tắt kế toán"
              items={[
                {
                  href: "/admin/hoa-don",
                  label: "Thu tiền hóa đơn",
                  note: `${stats.phanTichKeToan.hoaDon.chuaThanhToan} hóa đơn cần xử lý`,
                },
                {
                  href: "/admin/hoa-don",
                  label: "Xuất hóa đơn",
                  note: `Đã thu ${stats.phanTichKeToan.hoaDon.tyLeThuTien}% tổng hóa đơn`,
                },
              ]}
            />
          </div>
        </>
      )}

      {user.vaiTro === "BuongPhong" && stats && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              icon={<Sparkles className="h-5 w-5 text-rose-700" />}
              label="Cần dọn ngay"
              value={String(stats.hieuSuatBuongPhong.tonDonHienTai)}
              detail="Phòng vừa check-out"
            />
            <MetricCard
              icon={<Users className="h-5 w-5 text-cyan-700" />}
              label="Checkout 7 ngày"
              value={String(stats.hieuSuatBuongPhong.checkout7Ngay)}
              detail="Khối lượng phát sinh"
            />
            <MetricCard
              icon={<BedDouble className="h-5 w-5 text-emerald-700" />}
              label="Đã dọn 7 ngày"
              value={String(stats.hieuSuatBuongPhong.daDon7Ngay)}
              detail={`Tỷ lệ xử lý ${stats.hieuSuatBuongPhong.tyLeXuLySauCheckout}%`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Xu hướng checkout và dọn phòng (7 ngày)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.hieuSuatBuongPhong.xuHuong7Ngay.map((item) => (
                <div
                  key={item.ngay}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-2"
                >
                  <span className="text-sm font-medium text-slate-900">
                    {formatShortDay(item.ngay)}
                  </span>
                  <span className="text-sm text-gray-600">
                    Checkout {item.checkout} • Đã dọn {item.daDon}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Danh sách phòng cần dọn
              </CardTitle>
            </CardHeader>
            <CardContent>
              {roomsNeedCleaning.length === 0 ? (
                <div className="rounded-2xl border border-dashed py-10 text-center text-gray-500">
                  Không còn phòng nào cần dọn ngay.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {roomsNeedCleaning.map((room) => (
                    <div
                      key={room.soPhong}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            Phòng
                          </p>
                          <p className="text-2xl font-bold text-slate-900">
                            {room.soPhong}
                          </p>
                          <p className="text-sm text-gray-500">
                            {room.loaiPhong?.tenLoai ?? "Loại phòng"}
                          </p>
                        </div>
                        <Badge variant="destructive">
                          {TINH_TRANG_LABEL[room.tinhTrang]}
                        </Badge>
                      </div>
                      <Button
                        className="mt-4 w-full"
                        loading={cleaningRoom === room.soPhong}
                        onClick={() => handleCleanRoom(room.soPhong)}
                      >
                        Đánh dấu đã dọn
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
            <p className="mt-1 text-sm text-gray-500">{detail}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "success" | "warning" | "destructive";
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-gray-600">{label}</span>
      <Badge variant={tone}>{value}</Badge>
    </div>
  );
}

function QuickLinks({
  title,
  items,
}: {
  title: string;
  items: { href: string; label: string; note: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 transition hover:border-cyan-300 hover:bg-cyan-50"
          >
            <div>
              <p className="font-medium text-slate-900">{item.label}</p>
              <p className="text-sm text-gray-500">{item.note}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function ListCard({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: { title: string; subtitle: string; meta: string }[];
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-10 text-center text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={`${item.title}-${item.meta}`}
                className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.subtitle}</p>
                </div>
                <span className="text-sm font-medium text-slate-600">
                  {item.meta}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
