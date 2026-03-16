// ============================================================
// src/services/statsService.ts
// Dashboard: Thống kê tổng quan hệ thống khách sạn
// ============================================================

import prisma from "../lib/db";

const DASHBOARD_CACHE_TTL_MS = Number(
  process.env.DASHBOARD_CACHE_TTL_MS ?? 30_000,
);

let dashboardCache: { expiresAt: number; payload: unknown } | null = null;
let dashboardInFlight: Promise<unknown> | null = null;

function toNumberLike(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toString" in value) {
    return Number((value as { toString: () => string }).toString());
  }
  return 0;
}

function toDayKey(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return "";
}

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, offset: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + offset);
  return value;
}

function formatDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function percentChange(current: number, previous: number): number {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

function taoKhoangNgayGanNhat(days: number, endDate: Date) {
  return Array.from({ length: days }, (_, index) => {
    const dayStart = addDays(endDate, -(days - 1) + index);
    return {
      start: startOfDay(dayStart),
      end: addDays(startOfDay(dayStart), 1),
      ngay: formatDayKey(dayStart),
    };
  });
}

export async function layThongKeTongQuan() {
  const now = Date.now();
  if (dashboardCache && now < dashboardCache.expiresAt) {
    return dashboardCache.payload;
  }

  if (dashboardInFlight) {
    return dashboardInFlight;
  }

  dashboardInFlight = (async () => {
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const sevenDaysAgo = addDays(today, -6);
    const previousSevenDaysAgo = addDays(sevenDaysAgo, -7);
    const thirtyDaysAgo = addDays(today, -29);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    // Chạy tuần tự để tránh nghẽn pool khi DB chỉ cho 1 kết nối.
    const tongPhong = await prisma.phong.count();

    const phongTheoTinhTrang = await prisma.phong.groupBy({
      by: ["tinhTrang"],
      _count: { tinhTrang: true },
    });

    const datPhongTheoTrangThai = await prisma.phieuDatPhong.groupBy({
      by: ["trangThai"],
      _count: { trangThai: true },
    });

    const doanhThuThang = await prisma.hoaDon.aggregate({
      where: {
        trangThai: "DaThanhToan",
        ngayThanhToan: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { tongTien: true },
      _count: true,
    });

    const doanhThuHom = await prisma.hoaDon.aggregate({
      where: {
        trangThai: "DaThanhToan",
        ngayThanhToan: { gte: today, lt: tomorrow },
      },
      _sum: { tongTien: true },
      _count: true,
    });

    const khachCheckInHomNay = await prisma.phieuDatPhong.count({
      where: {
        trangThai: "DaCheckIn",
        ngayDen: { gte: today, lt: tomorrow },
      },
    });

    const khachCheckOutHomNay = await prisma.phieuDatPhong.count({
      where: {
        trangThai: "DaCheckOut",
        ngayDi: { gte: today, lt: tomorrow },
      },
    });

    const phieuChoXuLy = await prisma.phieuDatPhong.count({
      where: { trangThai: "ChoDuyet" },
    });

    const tongKhachHang = await prisma.khachHang.count();

    const phongCanDonDep = await prisma.phong.count({
      where: { tinhTrang: "CanDonDep" },
    });

    const tongHoaDon = await prisma.hoaDon.count();
    const hoaDonDaThanhToan = await prisma.hoaDon.count({
      where: { trangThai: "DaThanhToan" },
    });
    const hoaDonChuaThanhToan = await prisma.hoaDon.count({
      where: { trangThai: "ChuaThanhToan" },
    });

    const doanhThu7Ngay = await prisma.hoaDon.aggregate({
      where: {
        trangThai: "DaThanhToan",
        ngayThanhToan: { gte: sevenDaysAgo, lt: tomorrow },
      },
      _sum: { tongTien: true },
      _count: true,
    });

    const doanhThu7NgayTruoc = await prisma.hoaDon.aggregate({
      where: {
        trangThai: "DaThanhToan",
        ngayThanhToan: { gte: previousSevenDaysAgo, lt: sevenDaysAgo },
      },
      _sum: { tongTien: true },
      _count: true,
    });

    const doanhThu30Ngay = await prisma.hoaDon.aggregate({
      where: {
        trangThai: "DaThanhToan",
        ngayThanhToan: { gte: thirtyDaysAgo, lt: tomorrow },
      },
      _sum: { tongTien: true },
      _count: true,
    });

    const dailyWindows = taoKhoangNgayGanNhat(7, today);

    const doanhThuTheoNgayRaw = await prisma.$queryRaw<
      Array<{ ngay: unknown; doanhThu: unknown; soHoaDon: unknown }>
    >`
        SELECT
          date_trunc('day', "ngayThanhToan") AS "ngay",
          COALESCE(SUM("tongTien"), 0) AS "doanhThu",
          COUNT(*) AS "soHoaDon"
        FROM "HoaDon"
        WHERE "trangThai" = 'DaThanhToan'
          AND "ngayThanhToan" >= ${sevenDaysAgo}
          AND "ngayThanhToan" < ${tomorrow}
        GROUP BY 1
        ORDER BY 1 ASC
      `;

    const checkoutTheoNgayRaw = await prisma.$queryRaw<
      Array<{ ngay: unknown; checkout: unknown }>
    >`
        SELECT
          date_trunc('day', "ngayDi") AS "ngay",
          COUNT(*) AS "checkout"
        FROM "PhieuDatPhong"
        WHERE "trangThai" = 'DaCheckOut'
          AND "ngayDi" >= ${sevenDaysAgo}
          AND "ngayDi" < ${tomorrow}
        GROUP BY 1
        ORDER BY 1 ASC
      `;

    const donDepTheoNgayRaw = await prisma.$queryRaw<
      Array<{ ngay: unknown; daDon: unknown }>
    >`
        SELECT
          date_trunc('day', "thoiGian") AS "ngay",
          COUNT(*) AS "daDon"
        FROM "NhatKyBuongPhong"
        WHERE "hanhDong" ILIKE '%DonDep%'
          AND "thoiGian" >= ${sevenDaysAgo}
          AND "thoiGian" < ${tomorrow}
        GROUP BY 1
        ORDER BY 1 ASC
      `;

    // Tỷ lệ lấp đầy (chỉ tính phòng đang sử dụng / tổng phòng)
    const phongDangSuDung =
      phongTheoTinhTrang.find((p) => p.tinhTrang === "DangSuDung")?._count
        .tinhTrang ?? 0;
    const tyLeLapDay =
      tongPhong > 0 ? Math.round((phongDangSuDung / tongPhong) * 100) : 0;

    // Map phòng theo tình trạng
    const phongMap: Record<string, number> = {};
    for (const item of phongTheoTinhTrang) {
      phongMap[item.tinhTrang] = item._count.tinhTrang;
    }

    // Map phiếu theo trạng thái
    const phieuMap: Record<string, number> = {};
    for (const item of datPhongTheoTrangThai) {
      phieuMap[item.trangThai] = item._count.trangThai;
    }

    const tongHoaDonDaThu = Number(doanhThu7Ngay._sum.tongTien ?? 0);
    const tongHoaDonDaThuTuanTruoc = Number(
      doanhThu7NgayTruoc._sum.tongTien ?? 0,
    );
    const tongHoaDon30Ngay = Number(doanhThu30Ngay._sum.tongTien ?? 0);

    const tyLeThuTien =
      tongHoaDon > 0 ? Math.round((hoaDonDaThanhToan / tongHoaDon) * 100) : 0;

    const doanhThuTheoNgayMap = new Map<
      string,
      { doanhThu: number; soHoaDon: number }
    >();
    for (const row of doanhThuTheoNgayRaw) {
      const key = toDayKey(row.ngay);
      if (!key) continue;
      doanhThuTheoNgayMap.set(key, {
        doanhThu: toNumberLike(row.doanhThu),
        soHoaDon: toNumberLike(row.soHoaDon),
      });
    }

    const checkoutTheoNgayMap = new Map<string, number>();
    for (const row of checkoutTheoNgayRaw) {
      const key = toDayKey(row.ngay);
      if (!key) continue;
      checkoutTheoNgayMap.set(key, toNumberLike(row.checkout));
    }

    const donDepTheoNgayMap = new Map<string, number>();
    for (const row of donDepTheoNgayRaw) {
      const key = toDayKey(row.ngay);
      if (!key) continue;
      donDepTheoNgayMap.set(key, toNumberLike(row.daDon));
    }

    const checkout7Ngay = Array.from(checkoutTheoNgayMap.values()).reduce(
      (sum, value) => sum + value,
      0,
    );
    const daDon7Ngay = Array.from(donDepTheoNgayMap.values()).reduce(
      (sum, value) => sum + value,
      0,
    );

    const tyLeXuLySauCheckout =
      checkout7Ngay > 0
        ? Math.min(100, Math.round((daDon7Ngay / checkout7Ngay) * 100))
        : phongCanDonDep === 0
          ? 100
          : 0;

    const xuHuongDoanhThu7Ngay = dailyWindows.map((window, index) => ({
      ngay: window.ngay,
      doanhThu: doanhThuTheoNgayMap.get(window.ngay)?.doanhThu ?? 0,
      soHoaDon: doanhThuTheoNgayMap.get(window.ngay)?.soHoaDon ?? 0,
    }));

    const xuHuongBuongPhong7Ngay = dailyWindows.map((window) => ({
      ngay: window.ngay,
      checkout: checkoutTheoNgayMap.get(window.ngay) ?? 0,
      daDon: donDepTheoNgayMap.get(window.ngay) ?? 0,
    }));

    const payload = {
      success: true,
      data: {
        phong: {
          tong: tongPhong,
          trong: phongMap["Trong"] ?? 0,
          daDuocDat: phongMap["DaDuocDat"] ?? 0,
          dangSuDung: phongMap["DangSuDung"] ?? 0,
          canDonDep: phongMap["CanDonDep"] ?? 0,
          tyLeLapDay,
        },
        datPhong: {
          choDuyet: phieuMap["ChoDuyet"] ?? 0,
          daXacNhan: phieuMap["DaXacNhan"] ?? 0,
          daCheckIn: phieuMap["DaCheckIn"] ?? 0,
          daCheckOut: phieuMap["DaCheckOut"] ?? 0,
          daHuy: phieuMap["DaHuy"] ?? 0,
        },
        hoatDongHomNay: {
          checkInMoi: khachCheckInHomNay,
          checkOutMoi: khachCheckOutHomNay,
          doanhThu: Number(doanhThuHom._sum.tongTien ?? 0),
          soHoaDon: doanhThuHom._count,
        },
        doanhThuThang: {
          tongTien: Number(doanhThuThang._sum.tongTien ?? 0),
          soHoaDon: doanhThuThang._count,
        },
        canXuLy: {
          phieuChoDuyet: phieuChoXuLy,
          phongCanDonDep,
        },
        phanTichKeToan: {
          doanhThu7Ngay: tongHoaDonDaThu,
          doanhThu7NgayTuanTruoc: tongHoaDonDaThuTuanTruoc,
          tangTruong7Ngay: percentChange(
            tongHoaDonDaThu,
            tongHoaDonDaThuTuanTruoc,
          ),
          doanhThu30Ngay: tongHoaDon30Ngay,
          hoaDon: {
            tong: tongHoaDon,
            daThanhToan: hoaDonDaThanhToan,
            chuaThanhToan: hoaDonChuaThanhToan,
            tyLeThuTien,
          },
          xuHuongDoanhThu7Ngay,
        },
        hieuSuatBuongPhong: {
          checkout7Ngay,
          daDon7Ngay,
          tonDonHienTai: phongCanDonDep,
          tyLeXuLySauCheckout,
          xuHuong7Ngay: xuHuongBuongPhong7Ngay,
        },
        tongKhachHang,
      },
    };

    if (DASHBOARD_CACHE_TTL_MS > 0) {
      dashboardCache = {
        expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
        payload,
      };
    }

    return payload;
  })();

  try {
    return await dashboardInFlight;
  } finally {
    dashboardInFlight = null;
  }
}
