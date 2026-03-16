-- ============================================================
-- Checkout data expansion:
-- 1) Add actualCheckOutDate on PhieuDatPhong
-- 2) Add tienCocDaTru on HoaDon
-- 3) Add Surcharge table linked to PhieuDatPhong
-- ============================================================

ALTER TABLE "PhieuDatPhong"
ADD COLUMN IF NOT EXISTS "actualCheckOutDate" TIMESTAMP(3);

ALTER TABLE "HoaDon"
ADD COLUMN IF NOT EXISTS "tienCocDaTru" DECIMAL(15, 2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "Surcharge" (
  "id" TEXT NOT NULL,
  "maDatPhong" TEXT NOT NULL,
  "tenDichVu" TEXT NOT NULL,
  "soTien" DECIMAL(15, 2) NOT NULL,
  "ghiChu" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Surcharge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Surcharge_maDatPhong_idx" ON "Surcharge"("maDatPhong");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Surcharge_maDatPhong_fkey'
  ) THEN
    ALTER TABLE "Surcharge"
      ADD CONSTRAINT "Surcharge_maDatPhong_fkey"
      FOREIGN KEY ("maDatPhong")
      REFERENCES "PhieuDatPhong"("maDatPhong")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
