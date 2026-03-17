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

export type PhuongThucThanhToan = "TienMat" | "ChuyenKhoan" | "MoMo";

export type CheckoutPaymentMethod = "CASH" | "POS" | "MOMO_QR";

export type CheckoutPaymentStatus = "PENDING" | "SUCCESS";

export type VaiTroNhanVien =
  | "QuanLy"
  | "LeTan"
  | "BuongPhong"
  | "KeToan"
  | "KhachHang";

export type TrangThaiDoiTac = "DangHoatDong" | "TamNgung" | "DaKhoa";

export type CashShiftStatus = "OPEN" | "CLOSED";

export type CashVoucherType = "THU" | "CHI";

export type CashVoucherStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export type CashVoucherMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "POS"
  | "MOMO"
  | "OTHER";

export type PartnerSettlementStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

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

export interface LoaiPhongDatNhieu {
  idLoaiPhong: string;
  tenLoai: string;
  soLuotDat: number;
  giaThamKhao: number;
  sucChua?: number;
  soGiuong?: number;
  dienTich?: number;
  tienNghi?: string | null;
  albumAnh?: string | null;
  soPhongTrong: number;
}

export interface PhongGoiYData {
  topLoaiPhong: LoaiPhongDatNhieu[];
  phongNoiBat: Phong[];
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
  userId?: string | null;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
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

export interface CashShift {
  id: string;
  openedById: string;
  closedById?: string | null;
  openedAt: string;
  closedAt?: string | null;
  openingCash: number;
  expectedCash: number;
  actualCash?: number | null;
  variance?: number | null;
  note?: string | null;
  status: CashShiftStatus;
  openedBy?: NhanVien;
  closedBy?: NhanVien;
  summary?: {
    openingCash: number;
    cashFromInvoices: number;
    thuVoucher: number;
    chiVoucher: number;
    expected: number;
  };
}

export interface CashVoucher {
  id: string;
  voucherNo: string;
  type: CashVoucherType;
  status: CashVoucherStatus;
  method: CashVoucherMethod;
  amount: number;
  occurredAt: string;
  description: string;
  category?: string | null;
  referenceNo?: string | null;
  note?: string | null;
  shiftId?: string | null;
  doiTacId?: string | null;
  relatedInvoiceId?: string | null;
  relatedBookingId?: string | null;
  relatedSettlementId?: string | null;
  createdById: string;
  approvedById?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  shift?: Pick<CashShift, "id" | "openedAt" | "status">;
  doiTac?: Pick<DoiTac, "idDoiTac" | "tenDoiTac">;
  settlement?: {
    id: string;
    settlementCode: string;
  };
  createdBy?: NhanVien;
  approvedBy?: NhanVien;
}

export interface PartnerSettlement {
  id: string;
  settlementCode: string;
  idDoiTac: string;
  periodFrom: string;
  periodTo: string;
  grossRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  netReceivable: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate?: string | null;
  status: PartnerSettlementStatus;
  note?: string | null;
  createdById: string;
  approvedById?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  doiTac?: Pick<DoiTac, "idDoiTac" | "tenDoiTac" | "email" | "tyLeChietKhau">;
  vouchers?: Array<{
    id: string;
    voucherNo: string;
    amount: number;
    method: CashVoucherMethod;
    occurredAt: string;
  }>;
}

export interface AccountingOverview {
  caDangMo: {
    id: string;
    openedAt: string;
    openedBy: Pick<NhanVien, "idNhanVien" | "hoTen" | "vaiTro">;
    openingCash: number;
    cashFromInvoices: number;
    thuVoucher: number;
    chiVoucher: number;
    expected: number;
  } | null;
  thuChiThangNay: {
    tongThu: number;
    tongChi: number;
    dongTienRong: number;
  };
  congNoDoiTac: {
    soPhienDangTheoDoi: number;
    tongConPhaiThu: number;
  };
  hoaDonChoThu: {
    soHoaDon: number;
    tongTien: number;
  };
}

export interface OpenCashShiftInput {
  openingCash?: number;
  note?: string;
}

export interface CloseCashShiftInput {
  actualCash: number;
  note?: string;
}

export interface CreateCashVoucherInput {
  type: CashVoucherType;
  amount: number;
  method?: CashVoucherMethod;
  description: string;
  category?: string;
  referenceNo?: string;
  note?: string;
  occurredAt?: string;
  shiftId?: string;
  doiTacId?: string;
  relatedInvoiceId?: string;
  relatedBookingId?: string;
  relatedSettlementId?: string;
}

export interface CreatePartnerSettlementInput {
  idDoiTac: string;
  periodFrom: string;
  periodTo: string;
  commissionRate?: number;
  dueDate?: string;
  note?: string;
}

export interface CollectPartnerSettlementInput {
  amount: number;
  method?: CashVoucherMethod;
  occurredAt?: string;
  referenceNo?: string;
  note?: string;
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
  cccd_passport?: string;
  diaChi?: string;
}

export type BookingPaymentMethod = "QR" | "CARD";

export interface BookingCreateInput {
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  customer?: BookingMomoCustomerInput;
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
  sdt?: string;
  email?: string;
}

export interface LoginInput {
  taiKhoan: string;
  matKhau: string;
}

export interface LoginResponse {
  token: string;
  nhanVien: NhanVien;
}
