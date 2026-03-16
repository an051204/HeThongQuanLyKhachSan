// src/app/thanh-toan/page.tsx — Trang xác nhận & thanh toán

import { Suspense } from "react";
import FrmThanhToan from "@/components/khach-hang/frmThanhToan";

export default function ThanhToanPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Xác nhận đặt phòng</h1>
      </div>
      <Suspense
        fallback={
          <div className="text-center py-8 text-gray-400">Đang tải...</div>
        }
      >
        <FrmThanhToan />
      </Suspense>
    </div>
  );
}
