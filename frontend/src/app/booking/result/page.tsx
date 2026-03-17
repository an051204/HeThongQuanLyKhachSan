interface BookingResultPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

function getParam(value: string | string[] | undefined, fallback = ""): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

export default function BookingResultPage({
  searchParams,
}: BookingResultPageProps) {
  const status = getParam(searchParams?.status, "failed");
  const bookingId = getParam(searchParams?.bookingId, "N/A");
  const orderId = getParam(searchParams?.orderId, "N/A");
  const transId = getParam(searchParams?.transId, "N/A");
  const message = getParam(
    searchParams?.message,
    "Không nhận được thông tin phản hồi từ cổng thanh toán.",
  );
  const resultCode = getParam(searchParams?.resultCode, "N/A");
  const signatureValid = getParam(searchParams?.signatureValid, "false");

  const isSuccess = status === "success";

  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-center">
        <h1
          className={`text-3xl font-bold ${isSuccess ? "text-emerald-600" : "text-rose-600"}`}
        >
          {isSuccess
            ? "Đặt cọc thành công, đã giữ phòng!"
            : "Thanh toán thất bại"}
        </h1>
        <p className="mt-2 text-slate-600">{message}</p>
      </div>

      <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
        <div className="flex justify-between">
          <span className="text-slate-500">Booking ID</span>
          <span className="font-semibold">{bookingId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Order ID</span>
          <span className="font-semibold">{orderId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">MoMo Trans ID</span>
          <span className="font-semibold">{transId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Result Code</span>
          <span className="font-semibold">{resultCode}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Signature valid</span>
          <span className="font-semibold">{signatureValid}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <a
          href="/booking"
          className="flex-1 rounded-lg bg-cyan-700 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-cyan-800"
        >
          Quay lại đặt phòng
        </a>
        <a
          href="/booking/my"
          className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Xem phòng đã đặt
        </a>
        <a
          href="/"
          className="flex-1 rounded-lg bg-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-800 hover:bg-slate-300"
        >
          Về trang chủ
        </a>
      </div>
    </div>
  );
}
