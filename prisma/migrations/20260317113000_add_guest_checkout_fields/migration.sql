-- Add guest-checkout fields to booking table (PhieuDatPhong)
ALTER TABLE "PhieuDatPhong"
ADD COLUMN IF NOT EXISTS "userId" TEXT,
ADD COLUMN IF NOT EXISTS "guestName" TEXT,
ADD COLUMN IF NOT EXISTS "guestPhone" TEXT,
ADD COLUMN IF NOT EXISTS "guestEmail" TEXT;

-- Backfill from related KhachHang so existing rows remain valid.
UPDATE "PhieuDatPhong" AS p
SET
  "guestName" = COALESCE(p."guestName", kh."hoTen"),
  "guestPhone" = COALESCE(p."guestPhone", kh."sdt"),
  "guestEmail" = COALESCE(p."guestEmail", kh."email")
FROM "KhachHang" AS kh
WHERE p."idKhachHang" = kh."idKhachHang";

-- Fallback safety for any legacy row still missing values.
UPDATE "PhieuDatPhong"
SET
  "guestName" = COALESCE("guestName", 'Khach vang lai'),
  "guestPhone" = COALESCE("guestPhone", 'N/A'),
  "guestEmail" = COALESCE("guestEmail", 'guest@example.local')
WHERE "guestName" IS NULL
   OR "guestPhone" IS NULL
   OR "guestEmail" IS NULL;

ALTER TABLE "PhieuDatPhong"
ALTER COLUMN "guestName" SET NOT NULL,
ALTER COLUMN "guestPhone" SET NOT NULL,
ALTER COLUMN "guestEmail" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "PhieuDatPhong_userId_idx"
ON "PhieuDatPhong"("userId");
