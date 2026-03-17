import { Router } from "express";
import { body, param, query } from "express-validator";
import {
  cancelCashVoucher,
  closeCashShift,
  collectPartnerSettlement,
  confirmCashVoucher,
  createCashVoucher,
  createPartnerSettlement,
  getAccountingOverview,
  getCurrentCashShift,
  listAccountingPartners,
  listCashShifts,
  listCashVouchers,
  listPartnerSettlements,
  openCashShift,
} from "../controllers/accountingController";

const router = Router();

// Dashboard kế toán
router.get("/tong-quan", getAccountingOverview);
router.get("/doi-tac", listAccountingPartners);

// Đối soát ca thu ngân
router.get("/ca-thu-ngan", listCashShifts);
router.get("/ca-thu-ngan/hien-tai", getCurrentCashShift);
router.post(
  "/ca-thu-ngan/mo",
  [
    body("openingCash")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("openingCash phải là số không âm."),
    body("note").optional().isString(),
  ],
  openCashShift,
);
router.post(
  "/ca-thu-ngan/:id/dong",
  [
    param("id").notEmpty().isString(),
    body("actualCash")
      .notEmpty()
      .withMessage("actualCash là bắt buộc.")
      .isFloat({ min: 0 })
      .withMessage("actualCash phải là số không âm."),
    body("note").optional().isString(),
  ],
  closeCashShift,
);

// Phiếu thu/chi
router.get(
  "/phieu-thu-chi",
  [
    query("type").optional().isIn(["THU", "CHI"]),
    query("status").optional().isIn(["DRAFT", "CONFIRMED", "CANCELLED"]),
    query("search").optional().isString(),
    query("page").optional().isInt({ min: 1 }),
    query("pageSize").optional().isInt({ min: 1, max: 50 }),
  ],
  listCashVouchers,
);
router.post(
  "/phieu-thu-chi",
  [
    body("type")
      .isIn(["THU", "CHI"])
      .withMessage("type chỉ nhận THU hoặc CHI."),
    body("method")
      .optional()
      .isIn(["CASH", "BANK_TRANSFER", "POS", "MOMO", "OTHER"]),
    body("amount")
      .notEmpty()
      .withMessage("amount là bắt buộc.")
      .isFloat({ gt: 0 })
      .withMessage("amount phải lớn hơn 0."),
    body("description")
      .notEmpty()
      .withMessage("description là bắt buộc.")
      .isString(),
    body("category").optional().isString(),
    body("referenceNo").optional().isString(),
    body("note").optional().isString(),
    body("occurredAt").optional().isISO8601(),
    body("shiftId").optional().isString(),
    body("doiTacId").optional().isString(),
    body("relatedInvoiceId").optional().isString(),
    body("relatedBookingId").optional().isString(),
    body("relatedSettlementId").optional().isString(),
  ],
  createCashVoucher,
);
router.patch(
  "/phieu-thu-chi/:id/xac-nhan",
  [param("id").notEmpty().isString()],
  confirmCashVoucher,
);
router.patch(
  "/phieu-thu-chi/:id/huy",
  [param("id").notEmpty().isString()],
  cancelCashVoucher,
);

// Công nợ đối tác
router.get(
  "/cong-no-doi-tac",
  [
    query("idDoiTac").optional().isString(),
    query("status").optional().isString(),
    query("search").optional().isString(),
    query("page").optional().isInt({ min: 1 }),
    query("pageSize").optional().isInt({ min: 1, max: 50 }),
  ],
  listPartnerSettlements,
);
router.post(
  "/cong-no-doi-tac",
  [
    body("idDoiTac").notEmpty().isString(),
    body("periodFrom").notEmpty().isISO8601(),
    body("periodTo").notEmpty().isISO8601(),
    body("commissionRate").optional().isFloat({ min: 0, max: 100 }),
    body("dueDate").optional().isISO8601(),
    body("note").optional().isString(),
  ],
  createPartnerSettlement,
);
router.post(
  "/cong-no-doi-tac/:id/thu-tien",
  [
    param("id").notEmpty().isString(),
    body("amount")
      .notEmpty()
      .withMessage("amount là bắt buộc.")
      .isFloat({ gt: 0 })
      .withMessage("amount phải lớn hơn 0."),
    body("method")
      .optional()
      .isIn(["CASH", "BANK_TRANSFER", "POS", "MOMO", "OTHER"]),
    body("occurredAt").optional().isISO8601(),
    body("referenceNo").optional().isString(),
    body("note").optional().isString(),
  ],
  collectPartnerSettlement,
);

export default router;
