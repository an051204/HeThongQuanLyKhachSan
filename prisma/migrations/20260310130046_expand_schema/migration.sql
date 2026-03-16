/*
  Warnings:

  - The `vaiTro` column on the `NhanVien` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `loaiPhong` on the `Phong` table. All the data in the column will be lost.
  - Added the required column `tienPhong` to the `HoaDon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idLoaiPhong` to the `Phong` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VaiTroNhanVien" AS ENUM ('QuanLy', 'LeTan', 'BuongPhong', 'KeToan');

-- CreateEnum
CREATE TYPE "TrangThaiDoiTac" AS ENUM ('DangHoatDong', 'TamNgung', 'DaKhoa');

-- AlterTable
ALTER TABLE "HoaDon" ADD COLUMN     "ghiChu" TEXT,
ADD COLUMN     "phuongThucTT" TEXT,
ADD COLUMN     "tienDichVu" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tienPhong" DECIMAL(15,2) NOT NULL;

-- AlterTable
ALTER TABLE "KhachHang" ADD COLUMN     "ghiChu" TEXT,
ADD COLUMN     "ngaySinh" TIMESTAMP(3),
ADD COLUMN     "quocTich" TEXT;

-- AlterTable
ALTER TABLE "NhanVien" ADD COLUMN     "email" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sdt" TEXT,
DROP COLUMN "vaiTro",
ADD COLUMN     "vaiTro" "VaiTroNhanVien" NOT NULL DEFAULT 'LeTan';

-- AlterTable
ALTER TABLE "PhieuDatPhong" ADD COLUMN     "ghiChu" TEXT,
ADD COLUMN     "idDoiTac" TEXT,
ADD COLUMN     "soNguoi" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Phong" DROP COLUMN "loaiPhong",
ADD COLUMN     "idLoaiPhong" TEXT NOT NULL,
ADD COLUMN     "tang" INTEGER;

-- CreateTable
CREATE TABLE "LoaiPhong" (
    "idLoaiPhong" TEXT NOT NULL,
    "tenLoai" TEXT NOT NULL,
    "moTa" TEXT,
    "sucChua" INTEGER NOT NULL DEFAULT 2,
    "dienTich" DOUBLE PRECISION,
    "tienNghi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoaiPhong_pkey" PRIMARY KEY ("idLoaiPhong")
);

-- CreateTable
CREATE TABLE "DichVu" (
    "idDichVu" TEXT NOT NULL,
    "tenDichVu" TEXT NOT NULL,
    "donGia" DECIMAL(15,2) NOT NULL,
    "donVi" TEXT NOT NULL,
    "moTa" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DichVu_pkey" PRIMARY KEY ("idDichVu")
);

-- CreateTable
CREATE TABLE "ChiTietDichVu" (
    "id" TEXT NOT NULL,
    "maDatPhong" TEXT NOT NULL,
    "idDichVu" TEXT NOT NULL,
    "soLuong" INTEGER NOT NULL DEFAULT 1,
    "donGia" DECIMAL(15,2) NOT NULL,
    "ngaySuDung" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChiTietDichVu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiaDinh" (
    "id" TEXT NOT NULL,
    "idLoaiPhong" TEXT NOT NULL,
    "tuNgay" TIMESTAMP(3) NOT NULL,
    "denNgay" TIMESTAMP(3) NOT NULL,
    "giaMoi" DECIMAL(15,2) NOT NULL,
    "tenMua" TEXT,
    "moTa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiaDinh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoiTac" (
    "idDoiTac" TEXT NOT NULL,
    "tenDoiTac" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sdt" TEXT,
    "diaChi" TEXT,
    "tyLeChietKhau" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trangThai" "TrangThaiDoiTac" NOT NULL DEFAULT 'DangHoatDong',
    "apiKey" TEXT,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoiTac_pkey" PRIMARY KEY ("idDoiTac")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "idNhanVien" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NhatKyBuongPhong" (
    "id" TEXT NOT NULL,
    "soPhong" TEXT NOT NULL,
    "idNhanVien" TEXT NOT NULL,
    "hanhDong" TEXT NOT NULL,
    "ghiChu" TEXT,
    "thoiGian" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NhatKyBuongPhong_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoaiPhong_tenLoai_key" ON "LoaiPhong"("tenLoai");

-- CreateIndex
CREATE UNIQUE INDEX "DichVu_tenDichVu_key" ON "DichVu"("tenDichVu");

-- CreateIndex
CREATE UNIQUE INDEX "DoiTac_email_key" ON "DoiTac"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DoiTac_apiKey_key" ON "DoiTac"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- AddForeignKey
ALTER TABLE "Phong" ADD CONSTRAINT "Phong_idLoaiPhong_fkey" FOREIGN KEY ("idLoaiPhong") REFERENCES "LoaiPhong"("idLoaiPhong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhieuDatPhong" ADD CONSTRAINT "PhieuDatPhong_idDoiTac_fkey" FOREIGN KEY ("idDoiTac") REFERENCES "DoiTac"("idDoiTac") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChiTietDichVu" ADD CONSTRAINT "ChiTietDichVu_maDatPhong_fkey" FOREIGN KEY ("maDatPhong") REFERENCES "PhieuDatPhong"("maDatPhong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChiTietDichVu" ADD CONSTRAINT "ChiTietDichVu_idDichVu_fkey" FOREIGN KEY ("idDichVu") REFERENCES "DichVu"("idDichVu") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiaDinh" ADD CONSTRAINT "GiaDinh_idLoaiPhong_fkey" FOREIGN KEY ("idLoaiPhong") REFERENCES "LoaiPhong"("idLoaiPhong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_idNhanVien_fkey" FOREIGN KEY ("idNhanVien") REFERENCES "NhanVien"("idNhanVien") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NhatKyBuongPhong" ADD CONSTRAINT "NhatKyBuongPhong_soPhong_fkey" FOREIGN KEY ("soPhong") REFERENCES "Phong"("soPhong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NhatKyBuongPhong" ADD CONSTRAINT "NhatKyBuongPhong_idNhanVien_fkey" FOREIGN KEY ("idNhanVien") REFERENCES "NhanVien"("idNhanVien") ON DELETE RESTRICT ON UPDATE CASCADE;
