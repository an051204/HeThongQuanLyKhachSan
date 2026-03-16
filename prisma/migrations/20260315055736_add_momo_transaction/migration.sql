-- ============================================================
-- Normalize MoMo transaction schema.
-- This migration is idempotent so replay on shadow DB is stable.
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

ALTER TABLE "MomoTransaction" DROP CONSTRAINT IF EXISTS "fk_momo_invoice";
ALTER TABLE "MomoTransaction" DROP CONSTRAINT IF EXISTS "MomoTransaction_maHoaDon_fkey";

ALTER TABLE "MomoTransaction"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "id" TYPE TEXT USING "id"::TEXT,
  ALTER COLUMN "orderId" TYPE TEXT USING "orderId"::TEXT,
  ALTER COLUMN "maHoaDon" TYPE TEXT USING "maHoaDon"::TEXT,
  ALTER COLUMN "requestId" TYPE TEXT USING "requestId"::TEXT,
  ALTER COLUMN "transId" TYPE TEXT USING "transId"::TEXT,
  ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT,
  ALTER COLUMN "transDate" TYPE TIMESTAMP(3) USING "transDate"::TIMESTAMP(3),
  ALTER COLUMN "createdAt" TYPE TIMESTAMP(3) USING "createdAt"::TIMESTAMP(3),
  ALTER COLUMN "updatedAt" DROP DEFAULT,
  ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3) USING "updatedAt"::TIMESTAMP(3);

DROP SEQUENCE IF EXISTS "MomoTransaction_id_seq";

ALTER TABLE "VnpayTransaction"
  ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT,
  ALTER COLUMN "status" SET DEFAULT 'Created';

DROP TYPE IF EXISTS "TrangThaiVNPay";

DROP INDEX IF EXISTS "idx_momo_created";
DROP INDEX IF EXISTS "idx_momo_invoice";
DROP INDEX IF EXISTS "idx_momo_status";

CREATE UNIQUE INDEX IF NOT EXISTS "MomoTransaction_orderId_key" ON "MomoTransaction"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "MomoTransaction_maHoaDon_key" ON "MomoTransaction"("maHoaDon");
CREATE INDEX IF NOT EXISTS "MomoTransaction_createdAt_idx" ON "MomoTransaction"("createdAt");
CREATE INDEX IF NOT EXISTS "MomoTransaction_maHoaDon_idx" ON "MomoTransaction"("maHoaDon");
CREATE INDEX IF NOT EXISTS "MomoTransaction_status_idx" ON "MomoTransaction"("status");

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
