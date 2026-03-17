import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../lib/db";
import { AppError } from "../middleware/errorHandler";

type CashVoucherType = "THU" | "CHI";
type CashVoucherMethod = "CASH" | "BANK_TRANSFER" | "POS" | "MOMO" | "OTHER";
type CashVoucherStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface OpenCashShiftInput {
  openingCash?: number;
  note?: string;
}

export interface CloseCashShiftInput {
  actualCash: number;
  note?: string;
}

export interface VoucherListQuery {
  type?: CashVoucherType;
  status?: CashVoucherStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateCashVoucherInput {
  type: CashVoucherType;
  method?: CashVoucherMethod;
  amount: number;
  description: string;
  category?: string;
  referenceNo?: string;
  note?: string;
  occurredAt?: string;
  shiftId?: string;
  doiTacId?: string;
  relatedInvoiceId?: string;
  relatedBookingId?: string;
  relatedSettlementId?: string;
}

export interface SettlementListQuery {
  idDoiTac?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateSettlementInput {
  idDoiTac: string;
  periodFrom: string;
  periodTo: string;
  commissionRate?: number;
  dueDate?: string;
  note?: string;
}

export interface CollectSettlementInput {
  amount: number;
  method?: CashVoucherMethod;
  occurredAt?: string;
  referenceNo?: string;
  note?: string;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toString" in value) {
    return Number((value as { toString: () => string }).toString());
  }
  return 0;
}

function decimal(value: number): Decimal {
  return new Decimal(value);
}

function parsePositiveInteger(
  value: number | undefined,
  fallback: number,
): number {
  if (!Number.isInteger(value) || !value || value <= 0) return fallback;
  return value;
}

function parseOptionalDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, "Định dạng thời gian không hợp lệ.");
  }
  return date;
}

async function generateVoucherNo(type: CashVoucherType): Promise<string> {
  const prefix = type === "THU" ? "PT" : "PC";
  for (let retry = 0; retry < 5; retry += 1) {
    const ts = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    const suffix = Math.floor(Math.random() * 9000) + 1000;
    const voucherNo = `${prefix}-${ts}-${suffix}`;
    const exists = await prisma.cashVoucher.findUnique({
      where: { voucherNo },
      select: { id: true },
    });
    if (!exists) return voucherNo;
  }

  throw new AppError(500, "Không thể tạo mã phiếu thu/chi. Vui lòng thử lại.");
}

async function getCurrentOpenShift() {
  return prisma.cashShift.findFirst({
    where: { status: "OPEN" },
    include: {
      openedBy: { select: { idNhanVien: true, hoTen: true, vaiTro: true } },
    },
    orderBy: { openedAt: "desc" },
  });
}

async function computeShiftExpectedCash(shiftId: string) {
  const shift = await prisma.cashShift.findUnique({
    where: { id: shiftId },
    select: {
      id: true,
      openingCash: true,
      openedAt: true,
      closedAt: true,
      status: true,
    },
  });

  if (!shift) {
    throw new AppError(404, "Không tìm thấy ca thu ngân.");
  }

  const periodEnd = shift.closedAt ?? new Date();

  const [voucherFlow, cashInvoiceFlow] = await Promise.all([
    prisma.cashVoucher.groupBy({
      by: ["type"],
      where: {
        shiftId,
        status: "CONFIRMED",
        method: "CASH",
      },
      _sum: { amount: true },
    }),
    prisma.hoaDon.aggregate({
      where: {
        trangThai: "DaThanhToan",
        phuongThucTT: "TienMat",
        ngayThanhToan: {
          gte: shift.openedAt,
          lt: periodEnd,
        },
      },
      _sum: { tongTien: true },
    }),
  ]);

  const thuVoucher =
    toNumber(voucherFlow.find((item) => item.type === "THU")?._sum.amount) || 0;
  const chiVoucher =
    toNumber(voucherFlow.find((item) => item.type === "CHI")?._sum.amount) || 0;
  const cashFromInvoices = toNumber(cashInvoiceFlow._sum.tongTien) || 0;
  const openingCash = toNumber(shift.openingCash);
  const expected = openingCash + cashFromInvoices + thuVoucher - chiVoucher;

  return {
    openingCash,
    cashFromInvoices,
    thuVoucher,
    chiVoucher,
    expected,
  };
}

async function recomputeSettlement(
  tx: Prisma.TransactionClient,
  settlementId: string,
) {
  const settlement = await tx.partnerSettlement.findUnique({
    where: { id: settlementId },
    select: {
      id: true,
      netReceivable: true,
    },
  });

  if (!settlement) {
    throw new AppError(404, "Không tìm thấy phiên đối soát công nợ.");
  }

  const paidAgg = await tx.cashVoucher.aggregate({
    where: {
      relatedSettlementId: settlementId,
      status: "CONFIRMED",
      type: "THU",
    },
    _sum: { amount: true },
  });

  const paidAmount = toNumber(paidAgg._sum.amount);
  const netReceivable = toNumber(settlement.netReceivable);
  const outstandingAmount = Math.max(0, netReceivable - paidAmount);

  let status: "CONFIRMED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
  if (outstandingAmount === 0) {
    status = "PAID";
  } else if (paidAmount > 0) {
    status = "PARTIALLY_PAID";
  } else {
    status = "CONFIRMED";
  }

  return tx.partnerSettlement.update({
    where: { id: settlementId },
    data: {
      paidAmount: decimal(paidAmount),
      outstandingAmount: decimal(outstandingAmount),
      status,
    },
    include: {
      doiTac: {
        select: {
          idDoiTac: true,
          tenDoiTac: true,
          email: true,
        },
      },
    },
  });
}

export async function layTongQuanKeToan() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [openShift, voucherByType, settlements, unpaidInvoices] =
    await Promise.all([
      getCurrentOpenShift(),
      prisma.cashVoucher.groupBy({
        by: ["type"],
        where: {
          status: "CONFIRMED",
          occurredAt: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
        },
        _sum: { amount: true },
      }),
      prisma.partnerSettlement.aggregate({
        _sum: {
          outstandingAmount: true,
        },
        _count: {
          _all: true,
        },
        where: {
          status: {
            in: ["CONFIRMED", "PARTIALLY_PAID", "OVERDUE"],
          },
        },
      }),
      prisma.hoaDon.aggregate({
        _sum: { tongTien: true },
        _count: {
          _all: true,
        },
        where: {
          trangThai: "ChuaThanhToan",
        },
      }),
    ]);

  const tongThu =
    toNumber(voucherByType.find((item) => item.type === "THU")?._sum.amount) ||
    0;
  const tongChi =
    toNumber(voucherByType.find((item) => item.type === "CHI")?._sum.amount) ||
    0;

  let shiftSummary: {
    id: string;
    openedAt: Date;
    openedBy: { idNhanVien: string; hoTen: string; vaiTro: string };
    openingCash: number;
    cashFromInvoices: number;
    thuVoucher: number;
    chiVoucher: number;
    expected: number;
  } | null = null;

  if (openShift) {
    const summary = await computeShiftExpectedCash(openShift.id);
    shiftSummary = {
      id: openShift.id,
      openedAt: openShift.openedAt,
      openedBy: openShift.openedBy,
      ...summary,
    };
  }

  return {
    success: true,
    data: {
      caDangMo: shiftSummary,
      thuChiThangNay: {
        tongThu,
        tongChi,
        dongTienRong: tongThu - tongChi,
      },
      congNoDoiTac: {
        soPhienDangTheoDoi: settlements._count._all,
        tongConPhaiThu: toNumber(settlements._sum.outstandingAmount),
      },
      hoaDonChoThu: {
        soHoaDon: unpaidInvoices._count._all,
        tongTien: toNumber(unpaidInvoices._sum.tongTien),
      },
    },
  };
}

export async function moCaThuNgan(
  input: OpenCashShiftInput,
  idNhanVien: string,
) {
  const openingCash = Number(input.openingCash ?? 0);
  if (!Number.isFinite(openingCash) || openingCash < 0) {
    throw new AppError(400, "openingCash phải là số không âm.");
  }

  const openShift = await getCurrentOpenShift();
  if (openShift) {
    throw new AppError(
      409,
      `Đang có ca mở bởi ${openShift.openedBy.hoTen} từ ${openShift.openedAt.toISOString()}.`,
    );
  }

  const shift = await prisma.cashShift.create({
    data: {
      openedById: idNhanVien,
      openingCash: decimal(openingCash),
      note: input.note?.trim() || undefined,
      status: "OPEN",
    },
    include: {
      openedBy: {
        select: { idNhanVien: true, hoTen: true, vaiTro: true },
      },
    },
  });

  return { success: true, data: shift };
}

export async function dongCaThuNgan(
  shiftId: string,
  input: CloseCashShiftInput,
  idNhanVien: string,
) {
  const actualCash = Number(input.actualCash);
  if (!Number.isFinite(actualCash) || actualCash < 0) {
    throw new AppError(400, "actualCash phải là số không âm.");
  }

  const shift = await prisma.cashShift.findUnique({
    where: { id: shiftId },
    select: {
      id: true,
      status: true,
      note: true,
    },
  });

  if (!shift) {
    throw new AppError(404, "Không tìm thấy ca thu ngân.");
  }

  if (shift.status !== "OPEN") {
    throw new AppError(400, "Ca thu ngân này đã đóng trước đó.");
  }

  const summary = await computeShiftExpectedCash(shiftId);
  const variance = actualCash - summary.expected;

  const updated = await prisma.cashShift.update({
    where: { id: shiftId },
    data: {
      closedById: idNhanVien,
      closedAt: new Date(),
      expectedCash: decimal(summary.expected),
      actualCash: decimal(actualCash),
      variance: decimal(variance),
      status: "CLOSED",
      note:
        [shift.note, input.note?.trim()].filter(Boolean).join(" | ") ||
        undefined,
    },
    include: {
      openedBy: {
        select: { idNhanVien: true, hoTen: true, vaiTro: true },
      },
      closedBy: {
        select: { idNhanVien: true, hoTen: true, vaiTro: true },
      },
    },
  });

  return {
    success: true,
    data: {
      ...updated,
      summary,
    },
  };
}

export async function layCaThuNganHienTai() {
  const shift = await getCurrentOpenShift();
  if (!shift) {
    return {
      success: true,
      data: null,
    };
  }

  const summary = await computeShiftExpectedCash(shift.id);
  return {
    success: true,
    data: {
      ...shift,
      summary,
    },
  };
}

export async function danhSachCaThuNgan(page?: number, pageSize?: number) {
  const pageValue = parsePositiveInteger(page, 1);
  const pageSizeValue = Math.min(parsePositiveInteger(pageSize, 10), 50);
  const skip = (pageValue - 1) * pageSizeValue;

  const [items, totalItems] = await Promise.all([
    prisma.cashShift.findMany({
      include: {
        openedBy: {
          select: { idNhanVien: true, hoTen: true, vaiTro: true },
        },
        closedBy: {
          select: { idNhanVien: true, hoTen: true, vaiTro: true },
        },
      },
      orderBy: { openedAt: "desc" },
      skip,
      take: pageSizeValue,
    }),
    prisma.cashShift.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSizeValue));

  return {
    success: true,
    data: {
      items,
      pagination: {
        page: pageValue,
        pageSize: pageSizeValue,
        totalItems,
        totalPages,
        hasPreviousPage: pageValue > 1,
        hasNextPage: pageValue < totalPages,
      },
    },
  };
}

export async function taoPhieuThuChi(
  input: CreateCashVoucherInput,
  idNhanVien: string,
  autoConfirm = false,
) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(400, "amount phải lớn hơn 0.");
  }

  if (!["THU", "CHI"].includes(input.type)) {
    throw new AppError(400, "type chỉ nhận THU hoặc CHI.");
  }

  const method = (input.method ?? "CASH") as CashVoucherMethod;
  const occurredAt = parseOptionalDate(input.occurredAt) ?? new Date();
  const voucherNo = await generateVoucherNo(input.type);

  const openShift =
    method === "CASH" && !input.shiftId ? await getCurrentOpenShift() : null;

  const voucher = await prisma.cashVoucher.create({
    data: {
      voucherNo,
      type: input.type,
      status: autoConfirm ? "CONFIRMED" : "DRAFT",
      method,
      amount: decimal(amount),
      occurredAt,
      description: input.description.trim(),
      category: input.category?.trim() || undefined,
      referenceNo: input.referenceNo?.trim() || undefined,
      note: input.note?.trim() || undefined,
      shiftId: input.shiftId ?? openShift?.id,
      doiTacId: input.doiTacId,
      relatedInvoiceId: input.relatedInvoiceId,
      relatedBookingId: input.relatedBookingId,
      relatedSettlementId: input.relatedSettlementId,
      createdById: idNhanVien,
      approvedById: autoConfirm ? idNhanVien : undefined,
      approvedAt: autoConfirm ? new Date() : undefined,
    },
    include: {
      createdBy: { select: { idNhanVien: true, hoTen: true, vaiTro: true } },
      approvedBy: { select: { idNhanVien: true, hoTen: true, vaiTro: true } },
      doiTac: { select: { idDoiTac: true, tenDoiTac: true } },
      settlement: {
        select: {
          id: true,
          settlementCode: true,
        },
      },
    },
  });

  if (autoConfirm && input.relatedSettlementId && input.type === "THU") {
    await prisma.$transaction(async (tx) => {
      await recomputeSettlement(tx, input.relatedSettlementId!);
    });
  }

  return {
    success: true,
    data: voucher,
  };
}

export async function xacNhanPhieuThuChi(id: string, idNhanVien: string) {
  return prisma.$transaction(async (tx) => {
    const voucher = await tx.cashVoucher.findUnique({
      where: { id },
      include: {
        settlement: {
          select: { id: true },
        },
      },
    });

    if (!voucher) {
      throw new AppError(404, "Không tìm thấy phiếu thu/chi.");
    }

    if (voucher.status === "CANCELLED") {
      throw new AppError(400, "Phiếu đã hủy, không thể xác nhận.");
    }

    if (voucher.status === "CONFIRMED") {
      return {
        success: true,
        message: "Phiếu đã được xác nhận trước đó.",
        data: voucher,
      };
    }

    const updatedVoucher = await tx.cashVoucher.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        approvedById: idNhanVien,
        approvedAt: new Date(),
      },
      include: {
        createdBy: { select: { idNhanVien: true, hoTen: true, vaiTro: true } },
        approvedBy: { select: { idNhanVien: true, hoTen: true, vaiTro: true } },
        doiTac: { select: { idDoiTac: true, tenDoiTac: true } },
        settlement: {
          select: {
            id: true,
            settlementCode: true,
          },
        },
      },
    });

    if (updatedVoucher.relatedSettlementId && updatedVoucher.type === "THU") {
      await recomputeSettlement(tx, updatedVoucher.relatedSettlementId);
    }

    return {
      success: true,
      data: updatedVoucher,
    };
  });
}

export async function huyPhieuThuChi(id: string) {
  const voucher = await prisma.cashVoucher.findUnique({ where: { id } });
  if (!voucher) {
    throw new AppError(404, "Không tìm thấy phiếu thu/chi.");
  }

  if (voucher.status === "CONFIRMED") {
    throw new AppError(400, "Phiếu đã xác nhận, không thể hủy trực tiếp.");
  }

  const updated = await prisma.cashVoucher.update({
    where: { id },
    data: {
      status: "CANCELLED",
    },
  });

  return {
    success: true,
    data: updated,
  };
}

export async function danhSachPhieuThuChi(query: VoucherListQuery = {}) {
  const search = query.search?.trim();
  const where: Prisma.CashVoucherWhereInput = {
    ...(query.type && { type: query.type }),
    ...(query.status && { status: query.status }),
    ...(search && {
      OR: [
        { voucherNo: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { referenceNo: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const pageValue = parsePositiveInteger(query.page, 1);
  const pageSizeValue = Math.min(parsePositiveInteger(query.pageSize, 10), 50);
  const skip = (pageValue - 1) * pageSizeValue;

  const [items, totalItems] = await Promise.all([
    prisma.cashVoucher.findMany({
      where,
      include: {
        shift: {
          select: {
            id: true,
            openedAt: true,
            status: true,
          },
        },
        doiTac: {
          select: {
            idDoiTac: true,
            tenDoiTac: true,
          },
        },
        settlement: {
          select: {
            id: true,
            settlementCode: true,
          },
        },
        createdBy: {
          select: {
            idNhanVien: true,
            hoTen: true,
            vaiTro: true,
          },
        },
        approvedBy: {
          select: {
            idNhanVien: true,
            hoTen: true,
            vaiTro: true,
          },
        },
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: pageSizeValue,
    }),
    prisma.cashVoucher.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSizeValue));

  return {
    success: true,
    data: {
      items,
      pagination: {
        page: pageValue,
        pageSize: pageSizeValue,
        totalItems,
        totalPages,
        hasPreviousPage: pageValue > 1,
        hasNextPage: pageValue < totalPages,
      },
    },
  };
}

function calcSettlementFromRevenue(revenue: number, commissionRate: number) {
  const commissionAmount = (revenue * commissionRate) / 100;
  const netReceivable = Math.max(0, revenue - commissionAmount);
  return {
    commissionAmount,
    netReceivable,
    paidAmount: 0,
    outstandingAmount: netReceivable,
  };
}

async function generateSettlementCode() {
  const ts = new Date().toISOString().replace(/\D/g, "").slice(0, 12);
  return `CNS-${ts}-${Math.floor(Math.random() * 900 + 100)}`;
}

export async function taoDoiSoatCongNo(
  input: CreateSettlementInput,
  idNhanVien: string,
) {
  const periodFrom = parseOptionalDate(input.periodFrom);
  const periodTo = parseOptionalDate(input.periodTo);

  if (!periodFrom || !periodTo) {
    throw new AppError(400, "periodFrom và periodTo là bắt buộc.");
  }

  if (periodFrom > periodTo) {
    throw new AppError(400, "periodFrom phải nhỏ hơn hoặc bằng periodTo.");
  }

  const doiTac = await prisma.doiTac.findUnique({
    where: { idDoiTac: input.idDoiTac },
    select: {
      idDoiTac: true,
      tenDoiTac: true,
      tyLeChietKhau: true,
    },
  });

  if (!doiTac) {
    throw new AppError(404, "Không tìm thấy đối tác.");
  }

  const doanhThu = await prisma.hoaDon.aggregate({
    where: {
      trangThai: "DaThanhToan",
      ngayThanhToan: {
        gte: periodFrom,
        lte: periodTo,
      },
      phieuDatPhong: {
        is: {
          idDoiTac: input.idDoiTac,
        },
      },
    },
    _sum: {
      tongTien: true,
    },
  });

  const grossRevenue = toNumber(doanhThu._sum.tongTien);
  const commissionRate = Number(input.commissionRate ?? doiTac.tyLeChietKhau);

  if (
    !Number.isFinite(commissionRate) ||
    commissionRate < 0 ||
    commissionRate > 100
  ) {
    throw new AppError(400, "commissionRate phải trong khoảng 0-100.");
  }

  const calc = calcSettlementFromRevenue(grossRevenue, commissionRate);

  const settlement = await prisma.partnerSettlement.create({
    data: {
      settlementCode: await generateSettlementCode(),
      idDoiTac: input.idDoiTac,
      periodFrom,
      periodTo,
      grossRevenue: decimal(grossRevenue),
      commissionRate,
      commissionAmount: decimal(calc.commissionAmount),
      netReceivable: decimal(calc.netReceivable),
      paidAmount: decimal(calc.paidAmount),
      outstandingAmount: decimal(calc.outstandingAmount),
      dueDate: parseOptionalDate(input.dueDate),
      status: "CONFIRMED",
      note: input.note?.trim() || undefined,
      createdById: idNhanVien,
      approvedById: idNhanVien,
      approvedAt: new Date(),
    },
    include: {
      doiTac: {
        select: {
          idDoiTac: true,
          tenDoiTac: true,
          email: true,
          tyLeChietKhau: true,
        },
      },
      createdBy: {
        select: { idNhanVien: true, hoTen: true, vaiTro: true },
      },
      approvedBy: {
        select: { idNhanVien: true, hoTen: true, vaiTro: true },
      },
    },
  });

  return {
    success: true,
    data: settlement,
  };
}

export async function danhSachCongNoDoiTac(query: SettlementListQuery = {}) {
  const search = query.search?.trim();
  const where: Prisma.PartnerSettlementWhereInput = {
    ...(query.idDoiTac && { idDoiTac: query.idDoiTac }),
    ...(query.status && { status: query.status as any }),
    ...(search && {
      OR: [
        { settlementCode: { contains: search, mode: "insensitive" } },
        {
          doiTac: {
            is: { tenDoiTac: { contains: search, mode: "insensitive" } },
          },
        },
      ],
    }),
  };

  const pageValue = parsePositiveInteger(query.page, 1);
  const pageSizeValue = Math.min(parsePositiveInteger(query.pageSize, 10), 50);
  const skip = (pageValue - 1) * pageSizeValue;

  const [items, totalItems] = await Promise.all([
    prisma.partnerSettlement.findMany({
      where,
      include: {
        doiTac: {
          select: {
            idDoiTac: true,
            tenDoiTac: true,
            email: true,
            tyLeChietKhau: true,
          },
        },
        vouchers: {
          where: {
            status: "CONFIRMED",
            type: "THU",
          },
          select: {
            id: true,
            voucherNo: true,
            amount: true,
            method: true,
            occurredAt: true,
          },
          orderBy: { occurredAt: "desc" },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: pageSizeValue,
    }),
    prisma.partnerSettlement.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSizeValue));

  return {
    success: true,
    data: {
      items,
      pagination: {
        page: pageValue,
        pageSize: pageSizeValue,
        totalItems,
        totalPages,
        hasPreviousPage: pageValue > 1,
        hasNextPage: pageValue < totalPages,
      },
    },
  };
}

export async function thuTienCongNoDoiTac(
  settlementId: string,
  input: CollectSettlementInput,
  idNhanVien: string,
) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(400, "amount phải lớn hơn 0.");
  }

  const method = (input.method ?? "BANK_TRANSFER") as CashVoucherMethod;

  return prisma.$transaction(async (tx) => {
    const settlement = await tx.partnerSettlement.findUnique({
      where: { id: settlementId },
      include: {
        doiTac: {
          select: {
            idDoiTac: true,
            tenDoiTac: true,
          },
        },
      },
    });

    if (!settlement) {
      throw new AppError(404, "Không tìm thấy phiên công nợ đối tác.");
    }

    if (settlement.status === "CANCELLED" || settlement.status === "PAID") {
      throw new AppError(400, "Phiên công nợ này không nhận thêm thanh toán.");
    }

    const outstanding = toNumber(settlement.outstandingAmount);
    if (amount > outstanding) {
      throw new AppError(400, `Số thu vượt công nợ còn lại (${outstanding}).`);
    }

    const voucher = await tx.cashVoucher.create({
      data: {
        voucherNo: await generateVoucherNo("THU"),
        type: "THU",
        status: "CONFIRMED",
        method,
        amount: decimal(amount),
        occurredAt: parseOptionalDate(input.occurredAt) ?? new Date(),
        description: `Thu công nợ đối tác ${settlement.doiTac.tenDoiTac}`,
        category: "ThuCongNoDoiTac",
        referenceNo: input.referenceNo?.trim() || undefined,
        note: input.note?.trim() || undefined,
        doiTacId: settlement.idDoiTac,
        relatedSettlementId: settlement.id,
        createdById: idNhanVien,
        approvedById: idNhanVien,
        approvedAt: new Date(),
      },
      select: {
        id: true,
        voucherNo: true,
        amount: true,
        method: true,
        occurredAt: true,
      },
    });

    const settlementUpdated = await recomputeSettlement(tx, settlement.id);

    return {
      success: true,
      data: {
        settlement: settlementUpdated,
        voucher,
      },
    };
  });
}

export async function layDanhSachDoiTacKeToan() {
  const partners = await prisma.doiTac.findMany({
    select: {
      idDoiTac: true,
      tenDoiTac: true,
      email: true,
      tyLeChietKhau: true,
      trangThai: true,
    },
    where: {
      trangThai: {
        in: ["DangHoatDong", "TamNgung"],
      },
    },
    orderBy: [{ trangThai: "asc" }, { tenDoiTac: "asc" }],
  });

  return {
    success: true,
    data: partners,
  };
}
