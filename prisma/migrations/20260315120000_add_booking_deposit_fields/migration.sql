-- Add enum for booking deposit lifecycle
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookingDepositStatus') THEN
    CREATE TYPE "BookingDepositStatus" AS ENUM ('PENDING', 'DEPOSIT_PAID', 'CANCELLED');
  END IF;
END $$;

-- Add fields for MoMo booking-deposit flow
ALTER TABLE "PhieuDatPhong"
ADD COLUMN IF NOT EXISTS "id" TEXT,
ADD COLUMN IF NOT EXISTS "roomId" TEXT,
ADD COLUMN IF NOT EXISTS "checkInDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "checkOutDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "totalPrice" DECIMAL(15, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "depositAmount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "status" "BookingDepositStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "momoTransId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "PhieuDatPhong_id_key" ON "PhieuDatPhong"("id");
