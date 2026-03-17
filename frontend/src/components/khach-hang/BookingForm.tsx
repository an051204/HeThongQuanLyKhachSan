"use client";

import { useEffect, useMemo, useState } from "react";
import { taoDatPhongVaLayLinkMoMo } from "@/lib/api";
import { useAppToast } from "@/hooks/useAppToast";
import { useAuth } from "@/contexts/AuthContext";

interface RoomOption {
  id: string;
  name: string;
  pricePerNight: number;
}

const ROOM_OPTIONS: RoomOption[] = [
  { id: "101", name: "Standard - Room 101", pricePerNight: 850000 },
  { id: "203", name: "Deluxe - Room 203", pricePerNight: 1250000 },
  { id: "305", name: "Suite - Room 305", pricePerNight: 1850000 },
];

const DEPOSIT_RATE = 0.3;

interface JwtPayloadLike {
  userId?: string;
  idKhachHang?: string;
  idNhanVien?: string;
  taiKhoan?: string;
  hoTen?: string;
  name?: string;
  fullName?: string;
  sdt?: string;
  phone?: string;
  email?: string;
}

interface GuestContactForm {
  guestName: string;
  guestPhone: string;
  guestEmail: string;
}

function parseJwtPayload(token: string | null): JwtPayloadLike | null {
  if (!token) {
    return null;
  }

  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return null;

    const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = atob(padded);

    return JSON.parse(decoded) as JwtPayloadLike;
  } catch {
    return null;
  }
}

function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function toDateInputValue(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function BookingForm() {
  const { user, token, isAuthenticated } = useAuth();

  const tomorrow = useMemo(() => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    return toDateInputValue(next);
  }, []);

  const twoDaysLater = useMemo(() => {
    const next = new Date();
    next.setDate(next.getDate() + 3);
    return toDateInputValue(next);
  }, []);

  const [roomId, setRoomId] = useState<string>(ROOM_OPTIONS[0].id);
  const [checkInDate, setCheckInDate] = useState<string>(tomorrow);
  const [checkOutDate, setCheckOutDate] = useState<string>(twoDaysLater);

  const [guest, setGuest] = useState<GuestContactForm>({
    guestName: "",
    guestPhone: "",
    guestEmail: "",
  });

  const [loading, setLoading] = useState(false);
  const { error } = useAppToast();

  const selectedRoom =
    ROOM_OPTIONS.find((room) => room.id === roomId) ?? ROOM_OPTIONS[0];

  const nights = useMemo(() => {
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const diff = end.getTime() - start.getTime();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [checkInDate, checkOutDate]);

  const totalPrice = useMemo(
    () => Math.round(selectedRoom.pricePerNight * Math.max(nights, 0)),
    [selectedRoom.pricePerNight, nights],
  );

  const depositAmount = useMemo(
    () => Math.round(totalPrice * DEPOSIT_RATE),
    [totalPrice],
  );

  const canSubmit =
    !loading &&
    Boolean(guest.guestName.trim()) &&
    Boolean(guest.guestPhone.trim()) &&
    Boolean(guest.guestEmail.trim()) &&
    nights > 0 &&
    totalPrice > 0;

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const tokenPayload = parseJwtPayload(token);

    const fallbackName =
      user?.hoTen?.trim() ||
      tokenPayload?.hoTen?.trim() ||
      tokenPayload?.name?.trim() ||
      tokenPayload?.fullName?.trim() ||
      "";

    const fallbackPhone =
      user?.sdt?.trim() ||
      tokenPayload?.sdt?.trim() ||
      tokenPayload?.phone?.trim() ||
      "";

    const taiKhoanAsEmail = user?.taiKhoan?.includes("@")
      ? user.taiKhoan.trim()
      : "";

    const fallbackEmail =
      user?.email?.trim() ||
      tokenPayload?.email?.trim() ||
      tokenPayload?.taiKhoan?.trim() ||
      taiKhoanAsEmail;

    setGuest((prev) => ({
      guestName: prev.guestName || fallbackName,
      guestPhone: prev.guestPhone || fallbackPhone,
      guestEmail: prev.guestEmail || fallbackEmail,
    }));
  }, [isAuthenticated, token, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (nights <= 0) {
      error("Ngày trả phòng phải sau ngày nhận phòng.");
      return;
    }

    try {
      setLoading(true);

      const result = await taoDatPhongVaLayLinkMoMo({
        roomId,
        checkInDate,
        checkOutDate,
        totalPrice,
        guestName: guest.guestName,
        guestPhone: guest.guestPhone,
        guestEmail: guest.guestEmail,
        customer: {
          hoTen: guest.guestName,
          sdt: guest.guestPhone,
          email: guest.guestEmail,
        },
        note: `Khach tu dat phong qua form BookingForm (room ${roomId}).`,
      });

      if (!result.payUrl) {
        throw new Error("Không nhận được payUrl từ hệ thống.");
      }

      window.location.assign(result.payUrl);
    } catch (err) {
      error(
        err instanceof Error
          ? err.message
          : "Không thể tạo yêu cầu thanh toán MoMo.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-5">
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
            MoMo Sandbox v2
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Đặt phòng và thanh toán cọc
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Hệ thống sẽ tạo booking ở trạng thái chờ và chuyển bạn đến cổng MoMo
            để thanh toán 30% tiền cọc.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Chọn phòng
            </label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring-2"
            >
              {ROOM_OPTIONS.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} - {formatVnd(room.pricePerNight)}/đêm
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Ngày nhận phòng
            </label>
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring-2"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Ngày trả phòng
            </label>
            <input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring-2"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Họ tên
            </label>
            <input
              value={guest.guestName}
              onChange={(e) =>
                setGuest((prev) => ({ ...prev, guestName: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring-2"
              placeholder="Nguyen Van A"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Số điện thoại
            </label>
            <input
              value={guest.guestPhone}
              onChange={(e) =>
                setGuest((prev) => ({ ...prev, guestPhone: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring-2"
              placeholder="0901234567"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={guest.guestEmail}
              onChange={(e) =>
                setGuest((prev) => ({ ...prev, guestEmail: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring-2"
              placeholder="customer@example.com"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-6 w-full rounded-lg bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading
            ? "Đang tạo yêu cầu thanh toán..."
            : "Đặt phòng & Thanh toán cọc qua MoMo"}
        </button>
      </form>

      <aside className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">
          Chi tiết thanh toán
        </h3>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-slate-500">Phòng</span>
            <span className="font-semibold text-slate-800">
              {selectedRoom.name}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-slate-500">Số đêm</span>
            <span className="font-semibold text-slate-800">{nights} đêm</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-slate-500">Tổng tiền phòng</span>
            <span className="font-semibold text-slate-800">
              {formatVnd(totalPrice)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-cyan-50 px-3 py-2">
            <span className="font-medium text-cyan-800">Tiền cọc (30%)</span>
            <span className="text-base font-bold text-cyan-900">
              {formatVnd(depositAmount)}
            </span>
          </div>
          <p className="pt-2 text-xs text-slate-500">
            Sau khi thanh toán cọc thành công, booking được giữ phòng và trạng
            thái sẽ chuyển sang đã thanh toán cọc.
          </p>
        </div>
      </aside>
    </div>
  );
}
