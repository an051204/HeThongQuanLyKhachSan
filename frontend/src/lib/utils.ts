// src/lib/utils.ts — Utility functions

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes an toàn (dùng như cn() trong Shadcn) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format tiền VNĐ */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

/** Tính số đêm giữa 2 ngày */
export function tinhSoDem(ngayDen: string, ngayDi: string): number {
  const d1 = new Date(ngayDen);
  const d2 = new Date(ngayDi);
  return Math.max(
    1,
    Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

/** Format ngày thành dd/MM/yyyy */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

/** Label tiếng Việt cho trạng thái phòng */
export const TINH_TRANG_LABEL: Record<string, string> = {
  Trong: "Trống",
  DaDuocDat: "Đã được đặt",
  DangSuDung: "Đang sử dụng",
  CanDonDep: "Cần dọn dẹp",
};

/** Label tiếng Việt cho trạng thái đặt phòng */
export const TRANG_THAI_DAT_LABEL: Record<string, string> = {
  ChoDuyet: "Chờ duyệt",
  DaXacNhan: "Đã xác nhận",
  DaCheckIn: "Đã check-in",
  DaCheckOut: "Đã check-out",
  DaHuy: "Đã hủy",
};
