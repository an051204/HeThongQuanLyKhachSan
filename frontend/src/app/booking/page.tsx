import BookingForm from "@/components/khach-hang/BookingForm";

export default function BookingPage() {
  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-slate-900">
          Booking with MoMo Deposit
        </h1>
        <p className="mt-2 text-slate-600">
          Demo flow: tạo booking mới và thanh toán tiền cọc qua MoMo Sandbox API
          v2.
        </p>
      </div>
      <BookingForm />
    </div>
  );
}
