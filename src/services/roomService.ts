// ============================================================
// src/services/roomService.ts
// CRUD phòng + quy trình dọn dẹp
// ============================================================

import { Decimal } from "@prisma/client/runtime/library";
import { Prisma } from "@prisma/client";
import prisma from "../lib/db";
import { AppError } from "../middleware/errorHandler";

export interface TaoPhongInput {
  soPhong: string;
  idLoaiPhong: string;
  tang?: number;
  giaPhong: number;
  moTa?: string;
}

export interface CapNhatPhongInput {
  idLoaiPhong?: string;
  tang?: number;
  giaPhong?: number;
  moTa?: string;
}

export interface DanhSachPhongQueryInput {
  tinhTrang?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface TimPhongTrongQueryInput {
  ngayDen?: string;
  ngayDi?: string;
  loaiPhong?: string;
  sucChuaMin?: string;
  kichCo?: "" | "small" | "medium" | "large";
  soGiuongMin?: string;
  giaTu?: string;
  giaDen?: string;
  tienNghi?: string;
}

const ROOM_NUMBER_PATTERN = /^\d{3}$/;

function parseNonNegativeNumber(value: string | undefined, field: string) {
  if (!value || value.trim() === "") return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new AppError(400, `${field} không hợp lệ.`);
  }
  return parsed;
}

function parsePositiveInteger(value: string | undefined, field: string) {
  if (!value || value.trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(400, `${field} phải là số nguyên dương.`);
  }
  return parsed;
}

function parsePageValue(value: number | undefined, fallback: number) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value <= 0) return fallback;
  return value;
}

function coBoLocPhanTrang(input: DanhSachPhongQueryInput) {
  return (
    input.page !== undefined ||
    input.pageSize !== undefined ||
    Boolean(input.search?.trim())
  );
}

function validateRoomNumber(soPhong: string, tang?: number) {
  const normalized = soPhong.trim();

  if (!ROOM_NUMBER_PATTERN.test(normalized)) {
    throw new AppError(400, "Số phòng phải gồm đúng 3 chữ số (ví dụ: 101).");
  }

  if (
    tang !== undefined &&
    Number.isInteger(tang) &&
    tang > 0 &&
    tang < 10 &&
    !normalized.startsWith(String(tang))
  ) {
    throw new AppError(400, "Số phòng phải bắt đầu bằng số tầng tương ứng.");
  }

  return normalized;
}

// ── Lấy danh sách phòng ──────────────────────────────────────
export async function layDanhSachPhong(input: DanhSachPhongQueryInput = {}) {
  const search = input.search?.trim();
  const where: Prisma.PhongWhereInput = {
    ...(input.tinhTrang && { tinhTrang: input.tinhTrang as any }),
    ...(search && {
      OR: [
        { soPhong: { contains: search, mode: "insensitive" } },
        { moTa: { contains: search, mode: "insensitive" } },
        {
          loaiPhong: {
            tenLoai: { contains: search, mode: "insensitive" },
          },
        },
      ],
    }),
  };

  if (!coBoLocPhanTrang(input)) {
    const phongList = await prisma.phong.findMany({
      where,
      include: { loaiPhong: true },
      orderBy: { soPhong: "asc" },
    });
    return { success: true, data: phongList };
  }

  const page = parsePageValue(input.page, 1);
  const pageSize = Math.min(parsePageValue(input.pageSize, 10), 50);
  const skip = (page - 1) * pageSize;

  const [items, totalItems] = await Promise.all([
    prisma.phong.findMany({
      where,
      include: { loaiPhong: true },
      orderBy: { soPhong: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.phong.count({ where }),
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

// ── Tìm kiếm phòng trống theo khoảng ngày ────────────────────
export async function timPhongTrong(input: TimPhongTrongQueryInput) {
  const {
    ngayDen,
    ngayDi,
    loaiPhong,
    sucChuaMin,
    kichCo,
    soGiuongMin,
    giaTu,
    giaDen,
    tienNghi,
  } = input;

  if (ngayDen && ngayDi && new Date(ngayDi) <= new Date(ngayDen)) {
    throw new AppError(400, "Ngày đi phải sau ngày đến.");
  }

  const sucChuaMinValue = parsePositiveInteger(sucChuaMin, "sucChuaMin");
  const soGiuongMinValue = parsePositiveInteger(soGiuongMin, "soGiuongMin");
  const giaTuValue = parseNonNegativeNumber(giaTu, "giaTu");
  const giaDenValue = parseNonNegativeNumber(giaDen, "giaDen");

  if (
    giaTuValue !== undefined &&
    giaDenValue !== undefined &&
    giaTuValue > giaDenValue
  ) {
    throw new AppError(400, "giaTu không được lớn hơn giaDen.");
  }

  const loaiPhongWhere: Prisma.LoaiPhongWhereInput = {
    ...(loaiPhong?.trim() && {
      tenLoai: { equals: loaiPhong.trim(), mode: "insensitive" },
    }),
    ...(sucChuaMinValue !== undefined && { sucChua: { gte: sucChuaMinValue } }),
    ...(soGiuongMinValue !== undefined && {
      soGiuong: { gte: soGiuongMinValue },
    }),
  };

  if (kichCo) {
    if (kichCo === "small") {
      loaiPhongWhere.dienTich = { lt: 22 };
    } else if (kichCo === "medium") {
      loaiPhongWhere.dienTich = { gte: 22, lt: 35 };
    } else if (kichCo === "large") {
      loaiPhongWhere.dienTich = { gte: 35 };
    } else {
      throw new AppError(400, "kichCo không hợp lệ.");
    }
  }

  const danhSachTienNghi = (tienNghi ?? "")
    .split(/,|\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (danhSachTienNghi.length > 0) {
    const andFilters = danhSachTienNghi.map((item) => ({
      tienNghi: { contains: item, mode: "insensitive" as const },
    }));

    const currentAndFilters = Array.isArray(loaiPhongWhere.AND)
      ? loaiPhongWhere.AND
      : loaiPhongWhere.AND
        ? [loaiPhongWhere.AND]
        : [];

    loaiPhongWhere.AND = [...currentAndFilters, ...andFilters];
  }

  const giaPhongFilter: Prisma.DecimalFilter = {};
  if (giaTuValue !== undefined) {
    giaPhongFilter.gte = new Decimal(giaTuValue);
  }
  if (giaDenValue !== undefined) {
    giaPhongFilter.lte = new Decimal(giaDenValue);
  }

  const where: Prisma.PhongWhereInput = {
    tinhTrang: "Trong",
    ...(Object.keys(loaiPhongWhere).length > 0 && {
      loaiPhong: loaiPhongWhere,
    }),
    ...(Object.keys(giaPhongFilter).length > 0 && { giaPhong: giaPhongFilter }),
  };

  const phongList = await prisma.phong.findMany({
    where,
    include: { loaiPhong: true },
    orderBy: { soPhong: "asc" },
  });
  return { success: true, data: phongList };
}

// ── Chi tiết một phòng ────────────────────────────────────────
export async function layChiTietPhong(soPhong: string) {
  const phong = await prisma.phong.findUnique({
    where: { soPhong },
    include: {
      loaiPhong: true,
      phieuDatPhong: {
        where: { trangThai: { in: ["DaCheckIn", "ChoDuyet", "DaXacNhan"] } },
        select: {
          maDatPhong: true,
          ngayDen: true,
          ngayDi: true,
          trangThai: true,
          khachHang: { select: { hoTen: true, sdt: true } },
        },
        orderBy: { ngayDen: "desc" },
        take: 5,
      },
    },
  });

  if (!phong) {
    throw new AppError(404, `Không tìm thấy phòng số: ${soPhong}`);
  }

  return { success: true, data: phong };
}

// ── Tạo phòng mới ────────────────────────────────────────────
export async function taoPhong(input: TaoPhongInput) {
  const normalizedSoPhong = validateRoomNumber(input.soPhong, input.tang);

  const existing = await prisma.phong.findUnique({
    where: { soPhong: normalizedSoPhong },
  });
  if (existing) {
    throw new AppError(409, `Phòng số ${normalizedSoPhong} đã tồn tại.`);
  }

  const phong = await prisma.phong.create({
    data: {
      soPhong: normalizedSoPhong,
      idLoaiPhong: input.idLoaiPhong,
      tang: input.tang,
      giaPhong: new Decimal(input.giaPhong),
      moTa: input.moTa,
    },
    include: { loaiPhong: true },
  });

  return { success: true, data: phong };
}

// ── Cập nhật phòng ────────────────────────────────────────────
export async function capNhatPhong(soPhong: string, input: CapNhatPhongInput) {
  const phong = await prisma.phong.findUnique({ where: { soPhong } });
  if (!phong) {
    throw new AppError(404, `Không tìm thấy phòng số: ${soPhong}`);
  }

  const updated = await prisma.phong.update({
    where: { soPhong },
    data: {
      ...(input.idLoaiPhong !== undefined && {
        idLoaiPhong: input.idLoaiPhong,
      }),
      ...(input.tang !== undefined && { tang: input.tang }),
      ...(input.giaPhong !== undefined && {
        giaPhong: new Decimal(input.giaPhong),
      }),
      ...(input.moTa !== undefined && { moTa: input.moTa }),
    },
    include: { loaiPhong: true },
  });

  return { success: true, data: updated };
}

// ── Xóa phòng ────────────────────────────────────────────────
export async function xoaPhong(soPhong: string) {
  const phong = await prisma.phong.findUnique({ where: { soPhong } });
  if (!phong) {
    throw new AppError(404, `Không tìm thấy phòng số: ${soPhong}`);
  }
  if (phong.tinhTrang === "DangSuDung") {
    throw new AppError(400, "Không thể xóa phòng đang có khách ở.");
  }

  // Kiểm tra có phiếu đặt phòng active không
  const activeBooking = await prisma.phieuDatPhong.findFirst({
    where: {
      soPhong,
      trangThai: { in: ["ChoDuyet", "DaXacNhan", "DaCheckIn"] },
    },
  });
  if (activeBooking) {
    throw new AppError(
      400,
      "Không thể xóa phòng đang có phiếu đặt chưa hoàn tất.",
    );
  }

  await prisma.phong.delete({ where: { soPhong } });
  return { success: true, message: `Đã xóa phòng ${soPhong}.` };
}

// ── Đánh dấu phòng đã dọn dẹp (CanDonDep → Trong) ──────────
export async function donDepPhong(soPhong: string, idNhanVien?: string) {
  const phong = await prisma.phong.findUnique({ where: { soPhong } });
  if (!phong) {
    throw new AppError(404, `Không tìm thấy phòng số: ${soPhong}`);
  }
  if (phong.tinhTrang !== "CanDonDep") {
    throw new AppError(
      400,
      `Phòng ${soPhong} không ở trạng thái "Cần dọn dẹp" (hiện: ${phong.tinhTrang}).`,
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.phong.update({
      where: { soPhong },
      data: { tinhTrang: "Trong" },
    }),
    ...(idNhanVien
      ? [
          prisma.nhatKyBuongPhong.create({
            data: {
              soPhong,
              idNhanVien,
              hanhDong: "DonDep",
              ghiChu: "Danh dau phong da don dep va san sang don khach.",
            },
          }),
        ]
      : []),
  ]);

  return {
    success: true,
    message: `Phòng ${soPhong} đã sẵn sàng đón khách.`,
    data: updated,
  };
}
