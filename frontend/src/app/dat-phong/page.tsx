// src/app/dat-phong/page.tsx — Trang đặt phòng

import { Suspense } from "react";
import FrmDatPhong from "@/components/khach-hang/frmDatPhong";

export default function DatPhongPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Đặt phòng</h1>
        <p className="text-gray-500">
          Điền thông tin để hoàn tất việc đặt phòng.
        </p>
      </div>
      {/* Suspense cần thiết vì FrmDatPhong dùng useSearchParams() */}
      <Suspense
        fallback={
          <div className="text-center py-8 text-gray-400">Đang tải...</div>
        }
      >
        <FrmDatPhong />
      </Suspense>
    </div>
  );
}
