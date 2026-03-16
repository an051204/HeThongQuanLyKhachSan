-- ============================================================
-- Add momo transaction table for tracking MoMo payments.
-- This migration is made idempotent to keep shadow DB replay stable.
-- ============================================================

CREATE TABLE IF NOT EXISTS "MomoTransaction" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "maHoaDon" TEXT NOT NULL,
  "amount" DECIMAL(15, 2) NOT NULL,
  "requestId" TEXT NOT NULL,
  "transId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "extraData" TEXT,
  "responsePayload" TEXT,
  "transDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "MomoTransaction_orderId_key" ON "MomoTransaction"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "MomoTransaction_maHoaDon_key" ON "MomoTransaction"("maHoaDon");
CREATE INDEX IF NOT EXISTS "MomoTransaction_maHoaDon_idx" ON "MomoTransaction"("maHoaDon");
CREATE INDEX IF NOT EXISTS "MomoTransaction_status_idx" ON "MomoTransaction"("status");
CREATE INDEX IF NOT EXISTS "MomoTransaction_createdAt_idx" ON "MomoTransaction"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MomoTransaction_maHoaDon_fkey'
  ) THEN
    ALTER TABLE "MomoTransaction"
      ADD CONSTRAINT "MomoTransaction_maHoaDon_fkey"
      FOREIGN KEY ("maHoaDon")
      REFERENCES "HoaDon"("maHoaDon")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
