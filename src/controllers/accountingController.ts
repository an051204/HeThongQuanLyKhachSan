import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import {
  danhSachCaThuNgan,
  danhSachCongNoDoiTac,
  danhSachPhieuThuChi,
  dongCaThuNgan,
  huyPhieuThuChi,
  layCaThuNganHienTai,
  layDanhSachDoiTacKeToan,
  layTongQuanKeToan,
  moCaThuNgan,
  taoDoiSoatCongNo,
  taoPhieuThuChi,
  thuTienCongNoDoiTac,
  xacNhanPhieuThuChi,
} from "../services/accountingService";

function hasValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

function getAuthUserId(req: Request, res: Response): string | null {
  if (!req.user?.idNhanVien) {
    res.status(401).json({ success: false, message: "Chưa xác thực." });
    return null;
  }
  return req.user.idNhanVien;
}

export async function getAccountingOverview(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await layTongQuanKeToan();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listAccountingPartners(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await layDanhSachDoiTacKeToan();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listCashShifts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await danhSachCaThuNgan(
      req.query.page ? Number(req.query.page) : undefined,
      req.query.pageSize ? Number(req.query.pageSize) : undefined,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCurrentCashShift(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await layCaThuNganHienTai();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function openCashShift(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (hasValidationErrors(req, res)) return;

  try {
    const userId = getAuthUserId(req, res);
    if (!userId) return;

    const result = await moCaThuNgan(
      {
        openingCash: req.body.openingCash,
        note: req.body.note,
      },
      userId,
    );

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function closeCashShift(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (hasValidationErrors(req, res)) return;

  try {
    const userId = getAuthUserId(req, res);
    if (!userId) return;

    const result = await dongCaThuNgan(
      req.params.id,
      {
        actualCash: Number(req.body.actualCash),
        note: req.body.note,
      },
      userId,
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listCashVouchers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await danhSachPhieuThuChi({
      type: req.query.type as "THU" | "CHI" | undefined,
      status: req.query.status as
        | "DRAFT"
        | "CONFIRMED"
        | "CANCELLED"
        | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createCashVoucher(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (hasValidationErrors(req, res)) return;

  try {
    const userId = getAuthUserId(req, res);
    if (!userId) return;

    const result = await taoPhieuThuChi(
      {
        type: req.body.type,
        method: req.body.method,
        amount: Number(req.body.amount),
        description: req.body.description,
        category: req.body.category,
        referenceNo: req.body.referenceNo,
        note: req.body.note,
        occurredAt: req.body.occurredAt,
        shiftId: req.body.shiftId,
        doiTacId: req.body.doiTacId,
        relatedInvoiceId: req.body.relatedInvoiceId,
        relatedBookingId: req.body.relatedBookingId,
        relatedSettlementId: req.body.relatedSettlementId,
      },
      userId,
    );

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function confirmCashVoucher(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (hasValidationErrors(req, res)) return;

  try {
    const userId = getAuthUserId(req, res);
    if (!userId) return;

    const result = await xacNhanPhieuThuChi(req.params.id, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function cancelCashVoucher(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (hasValidationErrors(req, res)) return;

  try {
    const result = await huyPhieuThuChi(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listPartnerSettlements(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await danhSachCongNoDoiTac({
      idDoiTac: req.query.idDoiTac as string | undefined,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createPartnerSettlement(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (hasValidationErrors(req, res)) return;

  try {
    const userId = getAuthUserId(req, res);
    if (!userId) return;

    const result = await taoDoiSoatCongNo(
      {
        idDoiTac: req.body.idDoiTac,
        periodFrom: req.body.periodFrom,
        periodTo: req.body.periodTo,
        commissionRate: req.body.commissionRate,
        dueDate: req.body.dueDate,
        note: req.body.note,
      },
      userId,
    );

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function collectPartnerSettlement(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (hasValidationErrors(req, res)) return;

  try {
    const userId = getAuthUserId(req, res);
    if (!userId) return;

    const result = await thuTienCongNoDoiTac(
      req.params.id,
      {
        amount: Number(req.body.amount),
        method: req.body.method,
        occurredAt: req.body.occurredAt,
        referenceNo: req.body.referenceNo,
        note: req.body.note,
      },
      userId,
    );

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
