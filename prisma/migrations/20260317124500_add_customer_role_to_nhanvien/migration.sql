-- Add customer role for public customer registration flow.
ALTER TYPE "VaiTroNhanVien"
ADD VALUE IF NOT EXISTS 'KhachHang';
