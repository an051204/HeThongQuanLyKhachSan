-- CreateEnum
CREATE TYPE "TrangThaiVNPay" AS ENUM ('Created', 'Success', 'Failed', 'InvalidSignature');

-- CreateTable
CREATE TABLE "VnpayTransaction" (
    "id" TEXT NOT NULL,
    "maHoaDon" TEXT NOT NULL,
    "txnRef" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" "TrangThaiVNPay" NOT NULL DEFAULT 'Created',
    "responseCode" TEXT,
    "transactionNo" TEXT,
    "bankCode" TEXT,
    "sourceLast" TEXT,
    "requestPayload" TEXT,
    "callbackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VnpayTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VnpayTransaction_txnRef_key" ON "VnpayTransaction"("txnRef");

-- CreateIndex
CREATE INDEX "VnpayTransaction_maHoaDon_idx" ON "VnpayTransaction"("maHoaDon");

-- AddForeignKey
ALTER TABLE "VnpayTransaction" ADD CONSTRAINT "VnpayTransaction_maHoaDon_fkey" FOREIGN KEY ("maHoaDon") REFERENCES "HoaDon"("maHoaDon") ON DELETE RESTRICT ON UPDATE CASCADE;
