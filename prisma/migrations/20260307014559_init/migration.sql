-- CreateEnum
CREATE TYPE "TinhTrangPhong" AS ENUM ('Trong', 'DaDuocDat', 'DangSuDung', 'CanDonDep');

-- CreateEnum
CREATE TYPE "TrangThaiDat" AS ENUM ('ChoDuyet', 'DaXacNhan', 'DaCheckIn', 'DaCheckOut', 'DaHuy');

-- CreateEnum
CREATE TYPE "TrangThaiHoaDon" AS ENUM ('ChuaThanhToan', 'DaThanhToan', 'DaHuy');

-- CreateTable
CREATE TABLE "KhachHang" (
    "idKhachHang" TEXT NOT NULL,
    "hoTen" TEXT NOT NULL,
    "sdt" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cccd_passport" TEXT NOT NULL,
    "diaChi" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KhachHang_pkey" PRIMARY KEY ("idKhachHang")
);

-- CreateTable
CREATE TABLE "Phong" (
    "soPhong" TEXT NOT NULL,
    "loaiPhong" TEXT NOT NULL,
    "giaPhong" DECIMAL(15,2) NOT NULL,
    "tinhTrang" "TinhTrangPhong" NOT NULL DEFAULT 'Trong',
    "moTa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Phong_pkey" PRIMARY KEY ("soPhong")
);

-- CreateTable
CREATE TABLE "NhanVien" (
    "idNhanVien" TEXT NOT NULL,
    "hoTen" TEXT NOT NULL,
    "vaiTro" TEXT NOT NULL,
    "taiKhoan" TEXT NOT NULL,
    "matKhau" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NhanVien_pkey" PRIMARY KEY ("idNhanVien")
);

-- CreateTable
CREATE TABLE "PhieuDatPhong" (
    "maDatPhong" TEXT NOT NULL,
    "idKhachHang" TEXT NOT NULL,
    "soPhong" TEXT NOT NULL,
    "thoiGianDat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngayDen" TIMESTAMP(3) NOT NULL,
    "ngayDi" TIMESTAMP(3) NOT NULL,
    "tienCoc" DECIMAL(15,2) NOT NULL,
    "trangThai" "TrangThaiDat" NOT NULL DEFAULT 'ChoDuyet',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhieuDatPhong_pkey" PRIMARY KEY ("maDatPhong")
);

-- CreateTable
CREATE TABLE "HoaDon" (
    "maHoaDon" TEXT NOT NULL,
    "maDatPhong" TEXT NOT NULL,
    "idNhanVien" TEXT NOT NULL,
    "tongTien" DECIMAL(15,2) NOT NULL,
    "phuPhi" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ngayThanhToan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trangThai" "TrangThaiHoaDon" NOT NULL DEFAULT 'ChuaThanhToan',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HoaDon_pkey" PRIMARY KEY ("maHoaDon")
);

-- CreateIndex
CREATE UNIQUE INDEX "KhachHang_email_key" ON "KhachHang"("email");

-- CreateIndex
CREATE UNIQUE INDEX "KhachHang_cccd_passport_key" ON "KhachHang"("cccd_passport");

-- CreateIndex
CREATE UNIQUE INDEX "NhanVien_taiKhoan_key" ON "NhanVien"("taiKhoan");

-- CreateIndex
CREATE UNIQUE INDEX "HoaDon_maDatPhong_key" ON "HoaDon"("maDatPhong");

-- AddForeignKey
ALTER TABLE "PhieuDatPhong" ADD CONSTRAINT "PhieuDatPhong_idKhachHang_fkey" FOREIGN KEY ("idKhachHang") REFERENCES "KhachHang"("idKhachHang") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhieuDatPhong" ADD CONSTRAINT "PhieuDatPhong_soPhong_fkey" FOREIGN KEY ("soPhong") REFERENCES "Phong"("soPhong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HoaDon" ADD CONSTRAINT "HoaDon_maDatPhong_fkey" FOREIGN KEY ("maDatPhong") REFERENCES "PhieuDatPhong"("maDatPhong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HoaDon" ADD CONSTRAINT "HoaDon_idNhanVien_fkey" FOREIGN KEY ("idNhanVien") REFERENCES "NhanVien"("idNhanVien") ON DELETE RESTRICT ON UPDATE CASCADE;
