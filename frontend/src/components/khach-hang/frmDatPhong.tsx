"use client";
// ============================================================
// src/components/khach-hang/frmDatPhong.tsx
// Form đặt phòng: điền thông tin cá nhân + xác nhận đặt
//
// Flow:
//   1. Nhận thông tin phòng đã chọn từ URL query params
//   2. Khách điền thông tin cá nhân (hoTen, sdt, email, cccd, diaChi)
//   3. Submit → lưu yêu cầu tạm ở client
//   4. Chuyển sang trang thanh toán cọc để khách xác nhận
// ============================================================

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Phone,
  Mail,
  CreditCard,
  MapPin,
  BedDouble,
  Calendar,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAppToast } from "@/hooks/useAppToast";
import { formatVND, tinhSoDem, formatDate } from "@/lib/utils";

// Tiền cọc mặc định: 30% tổng tiền phòng
const TY_LE_COC = 0.3;
const PENDING_BOOKING_KEY = "khachsan_pending_booking";
const PENDING_BOOKING_EXPIRE_MS = 10 * 60 * 1000;

interface KhachHangForm {
  hoTen: string;
  sdt: string;
  email: string;
  cccd_passport: string;
  diaChi: string;
}

const INITIAL_FORM: KhachHangForm = {
  hoTen: "",
  sdt: "",
  email: "",
  cccd_passport: "",
  diaChi: "",
};

export default function FrmDatPhong() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Lấy thông tin phòng từ query params (do frmTimKiemPhong truyền sang)
  const soPhong = searchParams.get("soPhong") ?? "";
  const loaiPhong = searchParams.get("loaiPhong") ?? "";
  const giaPhong = Number(searchParams.get("giaPhong") ?? 0);
  const ngayDen = searchParams.get("ngayDen") ?? "";
  const ngayDi = searchParams.get("ngayDi") ?? "";

  const soDem = tinhSoDem(ngayDen, ngayDi);
  const tienPhong = giaPhong * soDem;
  const tienCoc = Math.round(tienPhong * TY_LE_COC);

  const [form, setForm] = useState<KhachHangForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<KhachHangForm>>({});
  const [loading, setLoading] = useState(false);
  const { error } = useAppToast();

  useEffect(() => {
    if (!soPhong) {
      error("Không có thông tin phòng. Vui lòng quay lại tìm kiếm.");
    }
  }, [error, soPhong]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Xóa lỗi khi user bắt đầu gõ lại
    if (errors[name as keyof KhachHangForm]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validate(): boolean {
    const newErrors: Partial<KhachHangForm> = {};
    if (!form.hoTen.trim()) newErrors.hoTen = "Họ tên là bắt buộc.";
    if (!form.sdt.match(/^(0|\+84)[0-9]{8,9}$/))
      newErrors.sdt = "Số điện thoại không hợp lệ.";
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      newErrors.email = "Email không hợp lệ.";
    if (!form.cccd_passport.trim())
      newErrors.cccd_passport = "CCCD/Hộ chiếu là bắt buộc.";
    if (!form.diaChi.trim()) newErrors.diaChi = "Địa chỉ là bắt buộc.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const pendingBooking = {
        createdAt: Date.now(),
        expiresAt: Date.now() + PENDING_BOOKING_EXPIRE_MS,
        khachHang: {
          hoTen: form.hoTen,
          sdt: form.sdt,
          email: form.email,
          cccd_passport: form.cccd_passport,
          diaChi: form.diaChi,
        },
        datPhong: {
          soPhong,
          loaiPhong,
          ngayDen,
          ngayDi,
          giaPhong,
          soDem,
          tienCoc,
          tongTien: tienPhong,
        },
      };

      sessionStorage.setItem(
        PENDING_BOOKING_KEY,
        JSON.stringify(pendingBooking),
      );
      router.push("/thanh-toan");
    } catch (err) {
      error(
        err instanceof Error
          ? err.message
          : "Không thể khởi tạo yêu cầu đặt phòng.",
      );
    } finally {
      setLoading(false);
    }
  }

  // Guard: nếu không có thông tin phòng
  if (!soPhong) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Không có thông tin phòng. Vui lòng{" "}
        <button className="underline" onClick={() => router.push("/")}>
          quay lại tìm kiếm
        </button>
        .
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-5">
      {/* ── Cột trái: Form thông tin khách hàng (3/5) ── */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Thông tin khách hàng
            </CardTitle>
            <CardDescription>
              Điền đầy đủ thông tin để hoàn tất đặt phòng.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Họ tên */}
              <FormField
                label="Họ và tên"
                icon={<User className="h-4 w-4" />}
                error={errors.hoTen}
              >
                <Input
                  name="hoTen"
                  placeholder="Nguyễn Văn A"
                  value={form.hoTen}
                  onChange={handleChange}
                  autoComplete="name"
                />
              </FormField>

              {/* SĐT */}
              <FormField
                label="Số điện thoại"
                icon={<Phone className="h-4 w-4" />}
                error={errors.sdt}
              >
                <Input
                  name="sdt"
                  type="tel"
                  placeholder="0901234567"
                  value={form.sdt}
                  onChange={handleChange}
                  autoComplete="tel"
                />
              </FormField>

              {/* Email */}
              <FormField
                label="Email"
                icon={<Mail className="h-4 w-4" />}
                error={errors.email}
              >
                <Input
                  name="email"
                  type="email"
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </FormField>

              {/* CCCD */}
              <FormField
                label="Số CCCD / Hộ chiếu"
                icon={<CreditCard className="h-4 w-4" />}
                error={errors.cccd_passport}
              >
                <Input
                  name="cccd_passport"
                  placeholder="012345678901"
                  value={form.cccd_passport}
                  onChange={handleChange}
                />
              </FormField>

              {/* Địa chỉ */}
              <FormField
                label="Địa chỉ"
                icon={<MapPin className="h-4 w-4" />}
                error={errors.diaChi}
              >
                <Input
                  name="diaChi"
                  placeholder="123 Đường ABC, Quận 1, TP.HCM"
                  value={form.diaChi}
                  onChange={handleChange}
                  autoComplete="address-line1"
                />
              </FormField>

              <Button
                type="submit"
                size="lg"
                loading={loading}
                className="w-full"
              >
                Xác nhận đặt phòng &amp; Thanh toán cọc
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* ── Cột phải: Tóm tắt đơn đặt phòng (2/5) ── */}
      <div className="lg:col-span-2">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BedDouble className="h-4 w-4 text-blue-600" />
              Tóm tắt đặt phòng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Thông tin phòng */}
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Phòng đã chọn
              </p>
              <p className="text-2xl font-bold text-blue-700">{soPhong}</p>
              <p className="text-sm text-gray-600">{loaiPhong}</p>
            </div>

            {/* Ngày */}
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Calendar className="h-3.5 w-3.5" /> Nhận phòng
                </span>
                <span className="font-medium">{formatDate(ngayDen)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Calendar className="h-3.5 w-3.5" /> Trả phòng
                </span>
                <span className="font-medium">{formatDate(ngayDi)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Số đêm</span>
                <span className="font-medium">{soDem} đêm</span>
              </div>
            </div>

            <hr />

            {/* Tính tiền */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {formatVND(giaPhong)} × {soDem} đêm
                </span>
                <span>{formatVND(tienPhong)}</span>
              </div>
              <div className="flex justify-between font-semibold text-blue-700">
                <span className="flex items-center gap-1">
                  <Banknote className="h-4 w-4" />
                  Tiền cọc (30%)
                </span>
                <span>{formatVND(tienCoc)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Còn lại khi check-out</span>
                <span>{formatVND(tienPhong - tienCoc)}</span>
              </div>
            </div>

            <hr />

            <p className="text-xs text-gray-400">
              * Yêu cầu đặt phòng chỉ được lưu vào hệ thống sau khi bạn xác nhận
              đã thanh toán cọc ở bước tiếp theo.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Helper component: Field wrapper với label + error ─────────
function FormField({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        <span className="text-gray-400">{icon}</span>
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
