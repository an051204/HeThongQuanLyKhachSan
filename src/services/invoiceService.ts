// ============================================================
// src/services/invoiceService.ts
// Quản lý hóa đơn: danh sách, chi tiết, thanh toán
// ============================================================

import prisma from "../lib/db";
import { AppError } from "../middleware/errorHandler";
import { Prisma } from "@prisma/client";

interface ThanhToanHoaDonOptions {
  phuongThucTT?: string;
  ghiChu?: string;
  allowIfPaid?: boolean;
}

export interface DanhSachHoaDonQueryInput {
  trangThai?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

function parsePageValue(value: number | undefined, fallback: number) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value <= 0) return fallback;
  return value;
}

function coBoLocPhanTrang(input: DanhSachHoaDonQueryInput) {
  return (
    input.page !== undefined ||
    input.pageSize !== undefined ||
    Boolean(input.search?.trim())
  );
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value?: Date | null): string {
  if (!value) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function formatPaymentMethod(value?: string | null): string {
  if (!value) return "Chưa cập nhật";

  switch (value) {
    case "TienMat":
      return "Tiền mặt";
    case "ChuyenKhoan":
      return "Chuyển khoản";
    default:
      return value;
  }
}

function formatInvoiceStatus(value: string): string {
  switch (value) {
    case "ChuaThanhToan":
      return "Chưa thanh toán";
    case "DaThanhToan":
      return "Đã thanh toán";
    case "DaHuy":
      return "Đã hủy";
    default:
      return value;
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function layHoaDonXuat(maHoaDon: string) {
  const hoaDon = await prisma.hoaDon.findUnique({
    where: { maHoaDon },
    include: {
      phieuDatPhong: {
        include: {
          khachHang: true,
          phong: {
            include: {
              loaiPhong: true,
            },
          },
        },
      },
      nhanVien: {
        select: {
          hoTen: true,
          taiKhoan: true,
        },
      },
    },
  });

  if (!hoaDon) {
    throw new AppError(404, `Không tìm thấy hóa đơn: ${maHoaDon}`);
  }

  return hoaDon;
}

function renderHoaDonHtml(hoaDon: Awaited<ReturnType<typeof layHoaDonXuat>>) {
  const tienPhong = Number(hoaDon.tienPhong);
  const tienDichVu = Number(hoaDon.tienDichVu);
  const phuPhi = Number(hoaDon.phuPhi);
  const tongTien = Number(hoaDon.tongTien);
  const tienCoc = Number(hoaDon.phieuDatPhong.tienCoc);

  const khach = hoaDon.phieuDatPhong.khachHang;
  const phong = hoaDon.phieuDatPhong.phong;

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hóa đơn ${escapeHtml(hoaDon.maHoaDon)}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 24px; }
    .wrap { max-width: 860px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; }
    .head { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
    .title { margin: 0; font-size: 22px; }
    .muted { color: #6b7280; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 16px 0; }
    .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
    th { background: #f9fafb; font-size: 13px; }
    .right { text-align: right; }
    .total { font-weight: 700; color: #0f766e; }
    .footer { margin-top: 18px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <div>
        <h1 class="title">Hóa đơn thanh toán</h1>
        <div class="muted">Mã hóa đơn: ${escapeHtml(hoaDon.maHoaDon)}</div>
        <div class="muted">Mã đặt phòng: ${escapeHtml(hoaDon.maDatPhong)}</div>
      </div>
      <div>
        <div><strong>Trạng thái:</strong> ${escapeHtml(formatInvoiceStatus(hoaDon.trangThai))}</div>
        <div><strong>Ngày thanh toán:</strong> ${escapeHtml(formatDateTime(hoaDon.ngayThanhToan))}</div>
        <div><strong>Phương thức:</strong> ${escapeHtml(formatPaymentMethod(hoaDon.phuongThucTT))}</div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div><strong>Thông tin khách hàng</strong></div>
        <div>${escapeHtml(khach.hoTen)}</div>
        <div class="muted">${escapeHtml(khach.email)}</div>
        <div class="muted">${escapeHtml(khach.sdt)}</div>
      </div>
      <div class="card">
        <div><strong>Thông tin phòng</strong></div>
        <div>Phòng ${escapeHtml(phong.soPhong)} - ${escapeHtml(phong.loaiPhong.tenLoai)}</div>
        <div class="muted">Ngày đến: ${escapeHtml(formatDateTime(hoaDon.phieuDatPhong.ngayDen))}</div>
        <div class="muted">Ngày đi: ${escapeHtml(formatDateTime(hoaDon.phieuDatPhong.ngayDi))}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Hạng mục</th>
          <th class="right">Số tiền</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Tiền phòng</td>
          <td class="right">${escapeHtml(formatMoney(tienPhong))}</td>
        </tr>
        <tr>
          <td>Tiền dịch vụ</td>
          <td class="right">${escapeHtml(formatMoney(tienDichVu))}</td>
        </tr>
        <tr>
          <td>Phụ phí</td>
          <td class="right">${escapeHtml(formatMoney(phuPhi))}</td>
        </tr>
        <tr>
          <td>Tiền cọc đã thu</td>
          <td class="right">-${escapeHtml(formatMoney(tienCoc))}</td>
        </tr>
        <tr>
          <td class="total">Tổng thanh toán</td>
          <td class="right total">${escapeHtml(formatMoney(tongTien))}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div>Nhân viên xử lý: ${escapeHtml(hoaDon.nhanVien.hoTen)} (${escapeHtml(hoaDon.nhanVien.taiKhoan)})</div>
      <div>Ghi chú: ${escapeHtml(hoaDon.ghiChu ?? "")}</div>
    </div>
  </div>
</body>
</html>`;
}

// ── Danh sách hóa đơn ────────────────────────────────────────
export async function layDanhSachHoaDon(input: DanhSachHoaDonQueryInput = {}) {
  const search = input.search?.trim();
  const where: Prisma.HoaDonWhereInput = {
    ...(input.trangThai && { trangThai: input.trangThai as any }),
    ...(search && {
      OR: [
        { maHoaDon: { contains: search, mode: "insensitive" } },
        { maDatPhong: { contains: search, mode: "insensitive" } },
        {
          phieuDatPhong: {
            is: {
              OR: [
                { soPhong: { contains: search, mode: "insensitive" } },
                {
                  khachHang: {
                    OR: [
                      { hoTen: { contains: search, mode: "insensitive" } },
                      { email: { contains: search, mode: "insensitive" } },
                      { sdt: { contains: search, mode: "insensitive" } },
                    ],
                  },
                },
              ],
            },
          },
        },
        {
          nhanVien: {
            is: {
              hoTen: { contains: search, mode: "insensitive" },
            },
          },
        },
      ],
    }),
  };

  if (!coBoLocPhanTrang(input)) {
    const list = await prisma.hoaDon.findMany({
      where,
      include: {
        phieuDatPhong: {
          include: {
            khachHang: { select: { hoTen: true, email: true, sdt: true } },
            phong: { include: { loaiPhong: { select: { tenLoai: true } } } },
          },
        },
        nhanVien: { select: { hoTen: true } },
      },
      orderBy: { ngayThanhToan: "desc" },
    });

    return { success: true, data: list };
  }

  const page = parsePageValue(input.page, 1);
  const pageSize = Math.min(parsePageValue(input.pageSize, 10), 50);
  const skip = (page - 1) * pageSize;

  const [items, totalItems] = await Promise.all([
    prisma.hoaDon.findMany({
      where,
      include: {
        phieuDatPhong: {
          include: {
            khachHang: { select: { hoTen: true, email: true, sdt: true } },
            phong: { include: { loaiPhong: { select: { tenLoai: true } } } },
          },
        },
        nhanVien: { select: { hoTen: true } },
      },
      orderBy: { ngayThanhToan: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.hoaDon.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    success: true,
    data: {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    },
  };
}

// ── Chi tiết hóa đơn ─────────────────────────────────────────
export async function layChiTietHoaDon(maHoaDon: string) {
  const hoaDon = await prisma.hoaDon.findUnique({
    where: { maHoaDon },
    include: {
      phieuDatPhong: {
        include: {
          khachHang: true,
          phong: true,
        },
      },
      nhanVien: { select: { hoTen: true, vaiTro: true } },
    },
  });

  if (!hoaDon) {
    throw new AppError(404, `Không tìm thấy hóa đơn: ${maHoaDon}`);
  }

  return { success: true, data: hoaDon };
}

// ── Đánh dấu đã thanh toán ───────────────────────────────────
export async function thanhToanHoaDon(
  maHoaDon: string,
  options: ThanhToanHoaDonOptions = {},
) {
  const hoaDon = await prisma.hoaDon.findUnique({
    where: { maHoaDon },
    include: {
      phieuDatPhong: {
        include: {
          khachHang: { select: { hoTen: true } },
          phong: { select: { soPhong: true } },
        },
      },
    },
  });

  if (!hoaDon) {
    throw new AppError(404, `Không tìm thấy hóa đơn: ${maHoaDon}`);
  }
  if (hoaDon.trangThai === "DaThanhToan") {
    if (options.allowIfPaid) {
      return {
        success: true,
        message: "Hóa đơn này đã được thanh toán trước đó.",
        data: hoaDon,
      };
    }
    throw new AppError(400, "Hóa đơn này đã được thanh toán.");
  }
  if (hoaDon.trangThai === "DaHuy") {
    throw new AppError(400, "Hóa đơn này đã bị hủy.");
  }

  const updated = await prisma.hoaDon.update({
    where: { maHoaDon },
    data: {
      trangThai: "DaThanhToan",
      ngayThanhToan: new Date(),
      ...(options.phuongThucTT && { phuongThucTT: options.phuongThucTT }),
      ...(options.ghiChu && { ghiChu: options.ghiChu }),
    },
    include: {
      phieuDatPhong: {
        include: {
          khachHang: { select: { hoTen: true } },
          phong: { select: { soPhong: true } },
        },
      },
    },
  });

  return { success: true, message: "Thanh toán thành công.", data: updated };
}

export async function xuatHoaDonHtml(maHoaDon: string) {
  const hoaDon = await layHoaDonXuat(maHoaDon);
  return {
    fileName: `hoa-don-${maHoaDon}.html`,
    content: renderHoaDonHtml(hoaDon),
  };
}
