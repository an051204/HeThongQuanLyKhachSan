// src/app/page.tsx — Trang chủ: tìm kiếm phòng

import FrmTimKiemPhong from "@/components/khach-hang/frmTimKiemPhong";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Đặt phòng trực tuyến
        </h1>
        <p className="mt-2 text-gray-500">
          Tìm kiếm và đặt phòng khách sạn nhanh chóng, dễ dàng.
        </p>
      </div>
      <FrmTimKiemPhong />
    </div>
  );
}
