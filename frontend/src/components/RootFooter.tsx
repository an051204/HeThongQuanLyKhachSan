import Link from "next/link";
import { BedDouble, Mail, Phone, MapPin, ShieldCheck } from "lucide-react";

const QUICK_LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/dat-phong", label: "Đặt phòng" },
  { href: "/thanh-toan", label: "Thanh toán" },
  { href: "/admin/dashboard", label: "Khu quản trị" },
];

export default function RootFooter() {
  return (
    <footer className="mt-14 border-t border-slate-200 bg-gradient-to-b from-white to-slate-100/70">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-38px_rgba(2,6,23,0.75)] md:grid-cols-3">
          <section>
            <div className="mb-3 flex items-center gap-2 text-slate-900">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                <BedDouble className="h-4 w-4" />
              </span>
              <h3 className="text-lg font-semibold">Khách Sạn Pro</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              Nền tảng quản lý và đặt phòng khách sạn với quy trình thanh toán,
              hóa đơn và vận hành đồng bộ theo vai trò.
            </p>
          </section>

          <section>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Điều hướng nhanh
            </h4>
            <ul className="space-y-2 text-sm text-slate-700">
              {QUICK_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:text-cyan-700"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Liên hệ hỗ trợ
            </h4>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-cyan-600" />
                1900 6868
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-cyan-600" />
                support@khachsanpro.vn
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-cyan-600" />
                68 Nguyễn Huệ, Quận 1, TP.HCM
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-slate-500">
          <p>© 2026 Khách Sạn Pro. All rights reserved.</p>
          <p className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Hệ thống vận hành an toàn
          </p>
        </div>
      </div>
    </footer>
  );
}
