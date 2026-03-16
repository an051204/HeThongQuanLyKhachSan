// src/types/index.ts — Shared TypeScript types cho toàn bộ Frontend

// ── Enums ─────────────────────────────────────────────────────
export type TinhTrangPhong = "Trong" | "DaDuocDat" | "DangSuDung" | "CanDonDep";

export type TrangThaiDat =
  | "ChoDuyet"
  | "DaXacNhan"
  | "DaCheckIn"
  | "DaCheckOut"
  | "DaHuy";

export type TrangThaiHoaDon = "ChuaThanhToan" | "DaThanhToan" | "DaHuy";

export type PhuongThucThanhToan = "TienMat" | "ChuyenKhoan" | "VNPay";

export type CheckoutPaymentMethod = "CASH" | "POS" | "MOMO_QR";

export type CheckoutPaymentStatus = "PENDING" | "SUCCESS";

export type VaiTroNhanVien = "QuanLy" | "LeTan" | "BuongPhong" | "KeToan";

export type TrangThaiDoiTac = "DangHoatDong" | "TamNgung" | "DaKhoa";

// ── Models ─────────────────────────────────────────────────────
export interface KhachHang {
  idKhachHang: string;
  hoTen: string;
  sdt: string;
  email: string;
  cccd_passport: string;
  diaChi: string;
  quocTich?: string;
  ngaySinh?: string;
  ghiChu?: string;
  _count?: { phieuDatPhong: number };
  createdAt?: string;
}

export interface LoaiPhong {
  idLoaiPhong: string;
  tenLoai: string;
  moTa?: string | null;
  sucChua: number;
  soGiuong: number;
  dienTich?: number;
  tienNghi?: string | null;
  albumAnh?: string | null;
  _count?: { phong: number };
}

export interface Phong {
  soPhong: string;
  idLoaiPhong: string;
  tang?: number;
  giaPhong: number;
  tinhTrang: TinhTrangPhong;
  moTa?: string;
  loaiPhong?: LoaiPhong;
}

export interface DichVu {
  idDichVu: string;
  tenDichVu: string;
  donGia: number;
  donVi: string;
  moTa?: string;
  isActive: boolean;
}

export interface ChiTietDichVu {
  id: string;
  maDatPhong: string;
  idDichVu: string;
  soLuong: number;
  donGia: number;
  ngaySuDung: string;
  dichVu?: Pick<DichVu, "tenDichVu" | "donVi">;
}

export interface Surcharge {
  id: string;
  maDatPhong: string;
  tenDichVu: string;
  soTien: number;
  ghiChu?: string;
  createdAt?: string;
}

export interface DoiTac {
  idDoiTac: string;
  tenDoiTac: string;
  email: string;
  sdt?: string;
  diaChi?: string;
  tyLeChietKhau: number;
  trangThai: TrangThaiDoiTac;
  apiKey?: string;
  ghiChu?: string;
  _count?: { phieuDatPhong: number };
}

export interface PhieuDatPhong {
  id?: string | null;
  maDatPhong: string;
  idKhachHang: string;
  soPhong: string;
  idDoiTac?: string;
  thoiGianDat: string;
  ngayDen: string;
  ngayDi: string;
  actualCheckOutDate?: string;
  soNguoi: number;
  tienCoc: number;
  trangThai: TrangThaiDat;
  ghiChu?: string;
  khachHang?: Pick<KhachHang, "hoTen" | "email" | "sdt">;
  phong?: Phong;
  hoaDon?: HoaDon;
}

export interface HoaDon {
  maHoaDon: string;
  maDatPhong: string;
  idNhanVien: string;
  tienPhong: number;
  tienDichVu: number;
  phuPhi: number;
  tienCocDaTru?: number;
  tongTien: number;
  paymentMethod?: CheckoutPaymentMethod | null;
  paymentStatus?: CheckoutPaymentStatus;
  phuongThucTT?: PhuongThucThanhToan | string;
  ngayThanhToan: string;
  trangThai: TrangThaiHoaDon;
  ghiChu?: string;
  phieuDatPhong?: {
    maDatPhong?: string;
    trangThai?: TrangThaiDat;
    khachHang: Pick<KhachHang, "hoTen" | "email">;
    phong: Phong;
    ngayDen?: string;
    ngayDi?: string;
  };
  nhanVien?: { hoTen: string };
}

export interface BookingHistoryItem {
  bookingId: string;
  maDatPhong: string;
  soPhong: string;
  tenLoaiPhong?: string | null;
  tenKhachHang: string;
  trangThai: Extract<TrangThaiDat, "DaCheckIn" | "DaCheckOut">;
  action: "CHECK_IN" | "CHECK_OUT";
  actionAt: string;
}

// ── Dashboard / Stats ──────────────────────────────────────────
export interface ThongKeTongQuan {
  phong: {
    tong: number;
    trong: number;
    daDuocDat: number;
    dangSuDung: number;
    canDonDep: number;
    tyLeLapDay: number;
  };
  datPhong: {
    choDuyet: number;
    daXacNhan: number;
    daCheckIn: number;
    daCheckOut: number;
    daHuy: number;
  };
  hoatDongHomNay: {
    checkInMoi: number;
    checkOutMoi: number;
    doanhThu: number;
    soHoaDon: number;
  };
  doanhThuThang: {
    tongTien: number;
    soHoaDon: number;
  };
  canXuLy: {
    phieuChoDuyet: number;
    phongCanDonDep: number;
  };
  phanTichKeToan: {
    doanhThu7Ngay: number;
    doanhThu7NgayTuanTruoc: number;
    tangTruong7Ngay: number;
    doanhThu30Ngay: number;
    hoaDon: {
      tong: number;
      daThanhToan: number;
      chuaThanhToan: number;
      tyLeThuTien: number;
    };
    xuHuongDoanhThu7Ngay: Array<{
      ngay: string;
      doanhThu: number;
      soHoaDon: number;
    }>;
  };
  hieuSuatBuongPhong: {
    checkout7Ngay: number;
    daDon7Ngay: number;
    tonDonHienTai: number;
    tyLeXuLySauCheckout: number;
    xuHuong7Ngay: Array<{
      ngay: string;
      checkout: number;
      daDon: number;
    }>;
  };
  tongKhachHang: number;
}

// ── API Response wrappers ──────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: { msg: string; path: string }[];
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ── Form inputs ────────────────────────────────────────────────
export interface TimKiemPhongInput {
  ngayDen: string;
  ngayDi: string;
  loaiPhong?: string;
  sucChuaMin?: string;
  kichCo?: "" | "small" | "medium" | "large";
  soGiuongMin?: string;
  giaTu?: string;
  giaDen?: string;
}

export interface DatPhongInput {
  idKhachHang: string;
  hoTen: string;
  sdt: string;
  email: string;
  cccd_passport: string;
  diaChi: string;
  soPhong: string;
  ngayDen: string;
  ngayDi: string;
  tienCoc: number;
}

export interface BookingMomoCustomerInput {
  hoTen: string;
  sdt: string;
  email: string;
  cccd_passport: string;
  diaChi: string;
}

export type BookingPaymentMethod = "QR" | "CARD";

export interface BookingCreateInput {
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  customer: BookingMomoCustomerInput;
  paymentMethod?: BookingPaymentMethod;
  note?: string;
}

export interface BookingCreateResponseData {
  payUrl: string;
  orderId: string;
  requestId: string;
  totalPrice: number;
  depositAmount: number;
  paymentMethod: BookingPaymentMethod;
  requestType: "captureWallet" | "payWithMethod";
}

export interface CheckInInput {
  maDatPhong: string;
}

export interface CheckOutInput {
  maDatPhong: string;
  idNhanVien: string;
  phuPhi?: number;
}

export interface CheckoutBookingInput {
  bookingId: string;
  actualCheckOutDate?: string;
  phuPhi?: number;
  surcharges?: Array<{
    tenDichVu: string;
    soTien: number;
    ghiChu?: string;
  }>;
}

export interface CheckoutBookingResult {
  booking: PhieuDatPhong;
  hoaDon: HoaDon;
  invoice: HoaDon;
  surcharges: Surcharge[];
  chiTietTinhTien: {
    soNgayO: number;
    giaPhongMoiDem: number;
    tienPhong: number;
    tongPhuPhi: number;
    tongPhuPhiDaLuu: number;
    tongPhuPhiMoi: number;
    tienCocDaTraTruoc: number;
    tongThanhToanTheoCongThuc: number;
    soTienConLai: number;
  };
}

export interface CheckoutOfflineInput {
  invoiceId: string;
  paymentMethod: "CASH" | "POS";
}

export interface CheckoutOfflineResult {
  invoice: HoaDon;
  booking: PhieuDatPhong;
  room: Phong;
}

export interface CheckoutGenerateQrInput {
  invoiceId: string;
}

export interface CheckoutGenerateQrResult {
  invoiceId: string;
  orderId?: string;
  requestId?: string;
  qrCodeUrl?: string;
  payUrl?: string;
  paymentStatus: CheckoutPaymentStatus;
}

export interface CheckoutStatusResult {
  invoiceId: string;
  paymentStatus: CheckoutPaymentStatus;
  paymentMethod?: CheckoutPaymentMethod | null;
  invoiceStatus: TrangThaiHoaDon;
  amount: number;
  updatedAt: string;
  booking: {
    maDatPhong: string;
    trangThai: TrangThaiDat;
    soPhong: string;
  };
}

// ── Auth ───────────────────────────────────────────────────────

export interface NhanVien {
  idNhanVien: string;
  hoTen: string;
  taiKhoan: string;
  vaiTro: VaiTroNhanVien;
}

export interface LoginInput {
  taiKhoan: string;
  matKhau: string;
}

export interface LoginResponse {
  token: string;
  nhanVien: NhanVien;
}

export interface VnpayCreatePaymentData {
  maHoaDon: string;
  phuongThuc: "VNPay";
  tongTien: number;
  txnRef: string;
  paymentUrl: string;
  hetHanLuc: string;
  note?: string;
}

export interface VnpayReturnData {
  maHoaDon: string;
  txnRef: string;
  responseCode: string;
  transactionNo: string;
  bankCode: string;
  paid: boolean;
  customerInvoiceUrl?: string;
}
