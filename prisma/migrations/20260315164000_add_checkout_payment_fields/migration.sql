-- ============================================================
-- Add checkout payment method/status fields for final settlement.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CheckoutPaymentMethod') THEN
    CREATE TYPE "CheckoutPaymentMethod" AS ENUM ('CASH', 'POS', 'MOMO_QR');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CheckoutPaymentStatus') THEN
    CREATE TYPE "CheckoutPaymentStatus" AS ENUM ('PENDING', 'SUCCESS');
  END IF;
END $$;

ALTER TABLE "HoaDon"
ADD COLUMN IF NOT EXISTS "paymentMethod" "CheckoutPaymentMethod",
ADD COLUMN IF NOT EXISTS "paymentStatus" "CheckoutPaymentStatus" NOT NULL DEFAULT 'PENDING';
