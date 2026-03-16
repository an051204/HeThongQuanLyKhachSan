"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RootHeader from "@/components/RootHeader";
import RootFooter from "@/components/RootFooter";
import { useAppToast } from "@/hooks/useAppToast";

interface PaymentResult {
  orderId: string;
  requestId: string;
  resultCode: number;
  message: string;
  payType: string;
  transId?: string;
}

function MoMoReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error: errorToast } = useAppToast();

  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<
    "loading" | "success" | "pending" | "failed"
  >("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    verifyPayment();
  }, [searchParams]);

  const verifyPayment = async () => {
    try {
      // Get all search params
      const params = new URLSearchParams(searchParams);
      const orderId = params.get("orderId");
      const resultCode = params.get("resultCode");
      const transId = params.get("transId");
      const message = params.get("message");
      const requestId = params.get("requestId");

      if (!orderId) {
        const message = "Không tìm thấy thông tin thanh toán";
        setError(message);
        errorToast(message, { id: "momo-return-missing-order" });
        setStatus("failed");
        return;
      }

      // Call backend to verify
      const response = await fetch("/api/payment/momo/verify-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          resultCode,
          transId,
          message,
          requestId,
        }),
      });

      const data = await response.json();

      setResult({
        orderId,
        resultCode: parseInt(resultCode || "0"),
        transId,
        message,
        requestId,
        ...data,
      });

      if (data.status === "COMPLETED") {
        setStatus("success");
      } else if (data.status === "PENDING") {
        setStatus("pending");
      } else {
        setStatus("failed");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Lỗi xác minh thanh toán";
      setError(message);
      errorToast(message, { id: "momo-return-verify-error" });
      setStatus("failed");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <RootHeader />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {status === "loading" && (
            <div className="text-center py-12">
              <div className="animate-spin inline-block">
                <svg
                  className="w-12 h-12 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <p className="mt-4 text-gray-600">Đang xác minh thanh toán...</p>
            </div>
          )}

          {status === "success" && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-green-600 mb-2">
                  Thanh Toán Thành Công
                </h1>
                <p className="text-gray-600">
                  Hóa đơn của bạn đã được thanh toán
                </p>
              </div>

              {result && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm">Mã Đơn Hàng</p>
                      <p className="font-semibold">{result.orderId}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Mã Giao Dịch MoMo</p>
                      <p className="font-semibold">{result.transId || "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Mã Yêu Cầu</p>
                      <p className="font-semibold text-sm">
                        {result.requestId}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Kết Quả</p>
                      <p className="font-semibold text-green-600">
                        {result.message || "Thành công"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/")}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Về Trang Chủ
                </button>
                <button
                  onClick={() => router.push("/dat-phong")}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Đặt Phòng Tiếp
                </button>
              </div>
            </div>
          )}

          {status === "pending" && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-yellow-600 mb-2">
                  Giao Dịch Đang Xử Lý
                </h1>
                <p className="text-gray-600">Vui lòng chờ xác nhận từ MoMo</p>
              </div>

              {result && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm">Mã Đơn Hàng</p>
                      <p className="font-semibold">{result.orderId}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Mã Yêu Cầu</p>
                      <p className="font-semibold text-sm">
                        {result.requestId}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => router.push("/")}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Về Trang Chủ
              </button>
            </div>
          )}

          {status === "failed" && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-red-600 mb-2">
                  Thanh Toán Thất Bại
                </h1>
                <p className="text-gray-600">
                  {error || "Giao dịch không thành công. Vui lòng thử lại."}
                </p>
              </div>

              {result && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm">Mã Đơn Hàng</p>
                      <p className="font-semibold">{result.orderId}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Lỗi</p>
                      <p className="font-semibold text-red-600">
                        {result.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => window.history.back()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Quay Lại
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Về Trang Chủ
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <RootFooter />
    </div>
  );
}

export default function MoMoReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-gray-500">
          Đang tải kết quả thanh toán...
        </div>
      }
    >
      <MoMoReturnContent />
    </Suspense>
  );
}
