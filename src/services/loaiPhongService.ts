// ============================================================
// src/services/loaiPhongService.ts
// CRUD danh mục loại phòng
// ============================================================

import prisma from "../lib/db";
import { AppError } from "../middleware/errorHandler";
import { Prisma } from "@prisma/client";

export interface TaoLoaiPhongInput {
  tenLoai: string;
  moTa?: string;
  sucChua?: number;
  soGiuong?: number;
  dienTich?: number;
  tienNghi?: string; // JSON text
  albumAnh?: string | null; // JSON text
}

export interface CapNhatLoaiPhongInput {
  tenLoai?: string;
  moTa?: string;
  sucChua?: number;
  soGiuong?: number;
  dienTich?: number;
  tienNghi?: string;
  albumAnh?: string | null;
}

export interface DanhSachLoaiPhongQueryInput {
  search?: string;
  page?: number;
  pageSize?: number;
}

function parsePageValue(value: number | undefined, fallback: number) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value <= 0) return fallback;
  return value;
}

function coBoLocPhanTrang(input: DanhSachLoaiPhongQueryInput) {
  return (
    input.page !== undefined ||
    input.pageSize !== undefined ||
    Boolean(input.search?.trim())
  );
}

function normalizeTextList(raw?: string | null): string | null {
  if (raw === undefined || raw === null) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  let values: string[] = [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      values = parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  } catch {
    const isDataUrl = /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(trimmed);

    if (isDataUrl) {
      values = [trimmed];
    } else if (trimmed.includes("\n")) {
      values = trimmed
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
        .flatMap((line) => {
          if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(line)) {
            return [line];
          }

          return line
            .split(/[;,]/)
            .map((item) => item.trim())
            .filter(Boolean);
        });
    } else {
      values = trimmed
        .split(/[;,]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  const uniqueValues = Array.from(new Set(values));
  if (uniqueValues.length === 0) return null;
  return JSON.stringify(uniqueValues);
}

// ── Danh sách loại phòng ──────────────────────────────────────
export async function layDanhSachLoaiPhong(
  input: DanhSachLoaiPhongQueryInput = {},
) {
  const search = input.search?.trim();
  const where: Prisma.LoaiPhongWhereInput | undefined = search
    ? {
        OR: [
          { tenLoai: { contains: search, mode: "insensitive" } },
          { moTa: { contains: search, mode: "insensitive" } },
          { tienNghi: { contains: search, mode: "insensitive" } },
        ],
      }
    : undefined;

  if (!coBoLocPhanTrang(input)) {
    const list = await prisma.loaiPhong.findMany({
      where,
      include: {
        _count: { select: { phong: true } },
      },
      orderBy: { tenLoai: "asc" },
    });
    return { success: true, data: list };
  }

  const page = parsePageValue(input.page, 1);
  const pageSize = Math.min(parsePageValue(input.pageSize, 10), 50);
  const skip = (page - 1) * pageSize;

  const [items, totalItems] = await Promise.all([
    prisma.loaiPhong.findMany({
      where,
      include: {
        _count: { select: { phong: true } },
      },
      orderBy: { tenLoai: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.loaiPhong.count({ where }),
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

// ── Chi tiết loại phòng ───────────────────────────────────────
export async function layChiTietLoaiPhong(idLoaiPhong: string) {
  const loaiPhong = await prisma.loaiPhong.findUnique({
    where: { idLoaiPhong },
    include: {
      phong: { select: { soPhong: true, tinhTrang: true, giaPhong: true } },
      giaDinh: { orderBy: { tuNgay: "asc" } },
    },
  });
  if (!loaiPhong) {
    throw new AppError(404, `Không tìm thấy loại phòng: ${idLoaiPhong}`);
  }
  return { success: true, data: loaiPhong };
}

// ── Tạo loại phòng ────────────────────────────────────────────
export async function taoLoaiPhong(input: TaoLoaiPhongInput) {
  const existing = await prisma.loaiPhong.findUnique({
    where: { tenLoai: input.tenLoai },
  });
  if (existing) {
    throw new AppError(409, `Loại phòng "${input.tenLoai}" đã tồn tại.`);
  }

  const createData = {
    tenLoai: input.tenLoai,
    moTa: input.moTa,
    sucChua: input.sucChua ?? 2,
    dienTich: input.dienTich,
    tienNghi: normalizeTextList(input.tienNghi),
    albumAnh: normalizeTextList(input.albumAnh),
  };

  // Keep dynamic assignment to avoid stale editor diagnostics on newly added fields.
  (createData as any).soGiuong = input.soGiuong ?? 1;

  const loaiPhong = await prisma.loaiPhong.create({
    data: createData,
  });

  return { success: true, data: loaiPhong };
}

// ── Cập nhật loại phòng ───────────────────────────────────────
export async function capNhatLoaiPhong(
  idLoaiPhong: string,
  input: CapNhatLoaiPhongInput,
) {
  const loaiPhong = await prisma.loaiPhong.findUnique({
    where: { idLoaiPhong },
  });
  if (!loaiPhong) {
    throw new AppError(404, `Không tìm thấy loại phòng: ${idLoaiPhong}`);
  }

  const tienNghiNormalized =
    input.tienNghi !== undefined
      ? normalizeTextList(input.tienNghi)
      : undefined;
  const albumAnhNormalized =
    input.albumAnh !== undefined
      ? normalizeTextList(input.albumAnh)
      : undefined;

  const updated = await prisma.loaiPhong.update({
    where: { idLoaiPhong },
    data: {
      ...(input.tenLoai !== undefined && { tenLoai: input.tenLoai }),
      ...(input.moTa !== undefined && { moTa: input.moTa }),
      ...(input.sucChua !== undefined && { sucChua: input.sucChua }),
      ...(input.soGiuong !== undefined && { soGiuong: input.soGiuong }),
      ...(input.dienTich !== undefined && { dienTich: input.dienTich }),
      ...(input.tienNghi !== undefined && { tienNghi: tienNghiNormalized }),
      ...(input.albumAnh !== undefined && { albumAnh: albumAnhNormalized }),
    },
  });

  return { success: true, data: updated };
}

// ── Xóa loại phòng ────────────────────────────────────────────
export async function xoaLoaiPhong(idLoaiPhong: string) {
  const loaiPhong = await prisma.loaiPhong.findUnique({
    where: { idLoaiPhong },
  });
  if (!loaiPhong) {
    throw new AppError(404, `Không tìm thấy loại phòng: ${idLoaiPhong}`);
  }

  const soPhong = await prisma.phong.count({ where: { idLoaiPhong } });
  if (soPhong > 0) {
    throw new AppError(
      400,
      `Không thể xóa loại phòng "${loaiPhong.tenLoai}" vì đang có ${soPhong} phòng thuộc loại này.`,
    );
  }

  await prisma.loaiPhong.delete({ where: { idLoaiPhong } });
  return {
    success: true,
    message: `Đã xóa loại phòng "${loaiPhong.tenLoai}".`,
  };
}
