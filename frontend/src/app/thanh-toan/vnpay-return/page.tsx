import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function VnpayReturnPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Thanh toán trực tuyến
        </h1>
      </div>
      <Alert variant="default">
        Chức năng thanh toán VNPay đã được tắt. Vui lòng quay lại quy trình đặt
        phòng và xác nhận thanh toán cọc theo hướng dẫn tại trang thanh toán.
      </Alert>
      <Link href="/thanh-toan" className="block">
        <Button className="w-full">Quay lại trang thanh toán</Button>
      </Link>
    </div>
  );
}
