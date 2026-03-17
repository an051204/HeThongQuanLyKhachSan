-- CreateEnum
CREATE TYPE "CashShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CashVoucherType" AS ENUM ('THU', 'CHI');

-- CreateEnum
CREATE TYPE "CashVoucherStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CashVoucherMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'POS', 'MOMO', 'OTHER');

-- CreateEnum
CREATE TYPE "PartnerSettlementStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "CashShift" (
    "id" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "closedById" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openingCash" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "expectedCash" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "actualCash" DECIMAL(15,2),
    "variance" DECIMAL(15,2),
    "note" TEXT,
    "status" "CashShiftStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSettlement" (
    "id" TEXT NOT NULL,
    "settlementCode" TEXT NOT NULL,
    "idDoiTac" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "grossRevenue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "netReceivable" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "outstandingAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "status" "PartnerSettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashVoucher" (
    "id" TEXT NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "type" "CashVoucherType" NOT NULL,
    "status" "CashVoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "method" "CashVoucherMethod" NOT NULL DEFAULT 'CASH',
    "amount" DECIMAL(15,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "referenceNo" TEXT,
    "note" TEXT,
    "shiftId" TEXT,
    "doiTacId" TEXT,
    "relatedInvoiceId" TEXT,
    "relatedBookingId" TEXT,
    "relatedSettlementId" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashShift_status_openedAt_idx" ON "CashShift"("status", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerSettlement_settlementCode_key" ON "PartnerSettlement"("settlementCode");

-- CreateIndex
CREATE INDEX "PartnerSettlement_idDoiTac_status_idx" ON "PartnerSettlement"("idDoiTac", "status");

-- CreateIndex
CREATE INDEX "PartnerSettlement_periodFrom_periodTo_idx" ON "PartnerSettlement"("periodFrom", "periodTo");

-- CreateIndex
CREATE UNIQUE INDEX "CashVoucher_voucherNo_key" ON "CashVoucher"("voucherNo");

-- CreateIndex
CREATE INDEX "CashVoucher_type_status_occurredAt_idx" ON "CashVoucher"("type", "status", "occurredAt");

-- CreateIndex
CREATE INDEX "CashVoucher_doiTacId_idx" ON "CashVoucher"("doiTacId");

-- CreateIndex
CREATE INDEX "CashVoucher_relatedSettlementId_idx" ON "CashVoucher"("relatedSettlementId");

-- AddForeignKey
ALTER TABLE "CashShift" ADD CONSTRAINT "CashShift_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "NhanVien"("idNhanVien") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashShift" ADD CONSTRAINT "CashShift_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "NhanVien"("idNhanVien") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSettlement" ADD CONSTRAINT "PartnerSettlement_idDoiTac_fkey" FOREIGN KEY ("idDoiTac") REFERENCES "DoiTac"("idDoiTac") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSettlement" ADD CONSTRAINT "PartnerSettlement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "NhanVien"("idNhanVien") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSettlement" ADD CONSTRAINT "PartnerSettlement_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "NhanVien"("idNhanVien") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashVoucher" ADD CONSTRAINT "CashVoucher_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "CashShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashVoucher" ADD CONSTRAINT "CashVoucher_doiTacId_fkey" FOREIGN KEY ("doiTacId") REFERENCES "DoiTac"("idDoiTac") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashVoucher" ADD CONSTRAINT "CashVoucher_relatedInvoiceId_fkey" FOREIGN KEY ("relatedInvoiceId") REFERENCES "HoaDon"("maHoaDon") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashVoucher" ADD CONSTRAINT "CashVoucher_relatedBookingId_fkey" FOREIGN KEY ("relatedBookingId") REFERENCES "PhieuDatPhong"("maDatPhong") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashVoucher" ADD CONSTRAINT "CashVoucher_relatedSettlementId_fkey" FOREIGN KEY ("relatedSettlementId") REFERENCES "PartnerSettlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashVoucher" ADD CONSTRAINT "CashVoucher_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "NhanVien"("idNhanVien") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashVoucher" ADD CONSTRAINT "CashVoucher_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "NhanVien"("idNhanVien") ON DELETE SET NULL ON UPDATE CASCADE;
