// ============================================================
// src/lib/api.ts — Centralized API Service
//
// Tất cả lời gọi HTTP đến backend Node.js đi qua file này.
// Dùng axios với interceptor để xử lý lỗi tập trung.
// ============================================================

import axios, { AxiosError } from "axios";
import { notifyApiError, notifyWarning } from "@/lib/notify";
import type {
  ApiResponse,
  Phong,
  LoaiPhong,
  DichVu,
  ChiTietDichVu,
  DoiTac,
  PhieuDatPhong,
  HoaDon,
  KhachHang,
  DatPhongInput,
  CheckOutInput,
  CheckoutBookingInput,
  CheckoutBookingResult,
  CheckoutOfflineInput,
  CheckoutOfflineResult,
  CheckoutGenerateQrInput,
  CheckoutGenerateQrResult,
  CheckoutStatusResult,
  ThongKeTongQuan,
  VnpayCreatePaymentData,
  VnpayReturnData,
  PaginatedResult,
  PaginationMeta,
  TimKiemPhongInput,
  PhuongThucThanhToan,
  BookingCreateInput,
  BookingCreateResponseData,
  BookingHistoryItem,
} from "@/types";

// ── Cấu hình Axios instance ───────────────────────────────────
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // 15 giây
});

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";
}

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};

function toPaginatedResult<T>(
  payload: PaginatedResult<T> | T[] | undefined,
): PaginatedResult<T> {
  if (payload && !Array.isArray(payload) && "items" in payload) {
    return payload;
  }

  const items = Array.isArray(payload) ? payload : [];
  return {
    items,
    pagination: {
      ...EMPTY_PAGINATION,
      pageSize: Math.max(items.length, 1),
      totalItems: items.length,
    },
  };
}

// ── Request interceptor: gắn JWT token vào mọi request ────────
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("khachsan_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response interceptor: chuẩn hóa lỗi + handle 401 ────────
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const message = notifyApiError(error, {
      notify: false,
      fallbackMessage: "Lỗi kết nối máy chủ. Vui lòng thử lại.",
    });

    // Token hết hạn hoặc không hợp lệ → xóa session và về trang login
    if (error.response?.status === 401 && typeof window !== "undefined") {
      notifyWarning(message, {
        id: "auth-expired",
        cooldownMs: 5000,
      });

      localStorage.removeItem("khachsan_token");
      localStorage.removeItem("khachsan_user");
      const isLoginPage = window.location.pathname === "/login";
      if (!isLoginPage) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(new Error(message));
  },
);

// ============================================================
// PHÒNG API
// ============================================================

/** Lấy danh sách phòng (có thể filter theo tinhTrang) */
export async function getPhongTrong(
  filters: Partial<TimKiemPhongInput> & { tienNghi?: string[] } = {},
): Promise<Phong[]> {
  const { data } = await apiClient.get<ApiResponse<Phong[]>>("/phong/trong", {
    params: {
      ...filters,
      tienNghi:
        filters.tienNghi && filters.tienNghi.length > 0
          ? filters.tienNghi.join(",")
          : undefined,
    },
  });
  return data.data ?? [];
}

/** Lấy tất cả phòng (cho admin) */
export async function getAllPhong(): Promise<Phong[]> {
  const { data } = await apiClient.get<ApiResponse<Phong[]>>("/phong");
  return data.data ?? [];
}

export async function getAllPhongPaged(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  tinhTrang?: string;
}): Promise<PaginatedResult<Phong>> {
  const { data } = await apiClient.get<
    ApiResponse<PaginatedResult<Phong> | Phong[]>
  >("/phong", { params });
  return toPaginatedResult<Phong>(data.data);
}

/** Lấy chi tiết một phòng */
export async function getPhongById(soPhong: string): Promise<Phong> {
  const { data } = await apiClient.get<ApiResponse<Phong>>(`/phong/${soPhong}`);
  return data.data!;
}

/** Tạo phòng mới (admin) */
export async function createPhong(
  payload: Omit<Phong, "tinhTrang">,
): Promise<Phong> {
  const { data } = await apiClient.post<ApiResponse<Phong>>("/phong", payload);
  return data.data!;
}

/** Cập nhật phòng (admin) */
export async function updatePhong(
  soPhong: string,
  payload: Partial<Phong>,
): Promise<Phong> {
  const { data } = await apiClient.put<ApiResponse<Phong>>(
    `/phong/${soPhong}`,
    payload,
  );
  return data.data!;
}

/** Xóa phòng (admin) */
export async function deletePhong(soPhong: string): Promise<void> {
  await apiClient.delete(`/phong/${soPhong}`);
}

// ============================================================
// ĐẶT PHÒNG API
// ============================================================

/**
 * Tạo phiếu đặt phòng (Use Case: Đặt phòng trực tuyến)
 * Backend sẽ đồng thời chuyển trạng thái phòng → DaDuocDat
 */
export async function taoPhieuDatPhong(
  payload: DatPhongInput,
): Promise<PhieuDatPhong> {
  // Bước 1: Tạo/tìm khách hàng rồi lấy idKhachHang
  // Trong thực tế có thể tách thành 2 bước: upsert KhachHang → DatPhong
  // Ở đây backend nhận toàn bộ payload và xử lý nội bộ
  const { data } = await apiClient.post<ApiResponse<PhieuDatPhong>>(
    "/dat-phong",
    {
      idKhachHang: payload.idKhachHang,
      soPhong: payload.soPhong,
      ngayDen: payload.ngayDen,
      ngayDi: payload.ngayDi,
      tienCoc: payload.tienCoc,
    },
  );
  return data.data!;
}

/**
 * Tạo hoặc cập nhật khách hàng (upsert bằng email)
 * Trả về idKhachHang để dùng cho đặt phòng
 */
export async function upsertKhachHang(payload: {
  hoTen: string;
  sdt: string;
  email: string;
  cccd_passport: string;
  diaChi: string;
}): Promise<string> {
  const { data } = await apiClient.post<ApiResponse<{ idKhachHang: string }>>(
    "/khach-hang/upsert",
    payload,
  );
  return data.data!.idKhachHang;
}

/** Lấy danh sách phiếu đặt (admin) */
export async function getDanhSachDatPhong(
  trangThai?: string,
): Promise<PhieuDatPhong[]> {
  const { data } = await apiClient.get<ApiResponse<PhieuDatPhong[]>>(
    "/dat-phong",
    { params: trangThai ? { trangThai } : {} },
  );
  return data.data ?? [];
}

export async function getDanhSachDatPhongPaged(params: {
  trangThai?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<PhieuDatPhong>> {
  const { data } = await apiClient.get<
    ApiResponse<PaginatedResult<PhieuDatPhong> | PhieuDatPhong[]>
  >("/dat-phong", { params });
  return toPaginatedResult<PhieuDatPhong>(data.data);
}

/** Lấy chi tiết phiếu đặt */
export async function getChiTietDatPhong(
  maDatPhong: string,
): Promise<PhieuDatPhong> {
  const { data } = await apiClient.get<ApiResponse<PhieuDatPhong>>(
    `/dat-phong/${maDatPhong}`,
  );
  return data.data!;
}

/** Hủy phiếu đặt phòng */
export async function huyDatPhong(maDatPhong: string): Promise<void> {
  await apiClient.delete(`/dat-phong/${maDatPhong}`);
}

export async function taoDatPhongVaLayLinkMoMo(
  payload: BookingCreateInput,
): Promise<BookingCreateResponseData> {
  const { data } = await apiClient.post<ApiResponse<BookingCreateResponseData>>(
    "/bookings/create",
    payload,
  );
  return data.data!;
}

export async function getBookingById(id: string): Promise<PhieuDatPhong> {
  const { data } = await apiClient.get<ApiResponse<PhieuDatPhong>>(
    `/bookings/${id}`,
  );
  return data.data!;
}

export async function getRecentBookingHistory(): Promise<BookingHistoryItem[]> {
  const { data } =
    await apiClient.get<ApiResponse<BookingHistoryItem[]>>("/bookings/history");
  return data.data ?? [];
}

export async function checkInBookingById(id: string): Promise<PhieuDatPhong> {
  const { data } = await apiClient.post<ApiResponse<PhieuDatPhong>>(
    `/bookings/${id}/checkin`,
  );
  return data.data!;
}

// ============================================================
// CHECK-IN API
// ============================================================

/**
 * Nhận phòng (Use Case: Check-in)
 * Chuyển trạng thái phiếu → DaCheckIn, phòng → DangSuDung
 */
export async function thucHienCheckIn(
  maDatPhong: string,
): Promise<PhieuDatPhong> {
  const { data } = await apiClient.patch<ApiResponse<PhieuDatPhong>>(
    `/check-in/${maDatPhong}`,
  );
  return data.data!;
}

// ============================================================
// CHECK-OUT API
// ============================================================

/**
 * Trả phòng (Use Case: Check-out)
 * Tính tổng tiền, tạo HoaDon, phòng → CanDonDep
 */
export async function thucHienCheckOut(
  payload: CheckOutInput,
): Promise<{ hoaDon: HoaDon; chiTietTinhTien: Record<string, number> }> {
  const { maDatPhong, ...body } = payload;
  const { data } = await apiClient.patch<
    ApiResponse<{ hoaDon: HoaDon; chiTietTinhTien: Record<string, number> }>
  >(`/check-out/${maDatPhong}`, body);
  return data.data!;
}

export async function checkoutBooking(
  payload: CheckoutBookingInput,
): Promise<CheckoutBookingResult> {
  const { bookingId, ...body } = payload;
  const { data } = await apiClient.post<ApiResponse<CheckoutBookingResult>>(
    `/bookings/${bookingId}/checkout`,
    body,
  );
  return data.data!;
}

export async function checkoutOfflinePayment(
  payload: CheckoutOfflineInput,
): Promise<CheckoutOfflineResult> {
  const { data } = await apiClient.post<ApiResponse<CheckoutOfflineResult>>(
    "/checkout/offline",
    payload,
  );
  return data.data!;
}

export async function checkoutGenerateQr(
  payload: CheckoutGenerateQrInput,
): Promise<CheckoutGenerateQrResult> {
  const { data } = await apiClient.post<ApiResponse<CheckoutGenerateQrResult>>(
    "/checkout/generate-qr",
    payload,
  );
  return data.data!;
}

export async function getCheckoutPaymentStatus(
  invoiceId: string,
): Promise<CheckoutStatusResult> {
  const { data } = await apiClient.get<ApiResponse<CheckoutStatusResult>>(
    `/checkout/status/${invoiceId}`,
  );
  return data.data!;
}

export default apiClient;

// ============================================================
// THỐNG KÊ / DASHBOARD API
// ============================================================

export async function getThongKeTongQuan(): Promise<ThongKeTongQuan> {
  const { data } = await apiClient.get<ApiResponse<ThongKeTongQuan>>(
    "/thong-ke/tong-quan",
    { timeout: 30000 },
  );
  return data.data!;
}

// ============================================================
// XÁC NHẬN ĐẶT PHÒNG
// ============================================================

export async function xacNhanDatPhong(
  maDatPhong: string,
): Promise<PhieuDatPhong> {
  const { data } = await apiClient.patch<ApiResponse<PhieuDatPhong>>(
    `/dat-phong/${maDatPhong}/xac-nhan`,
  );
  return data.data!;
}

// ============================================================
// HÓA ĐƠN API
// ============================================================

export async function getDanhSachHoaDon(trangThai?: string): Promise<HoaDon[]> {
  const { data } = await apiClient.get<ApiResponse<HoaDon[]>>("/hoa-don", {
    params: trangThai ? { trangThai } : {},
  });
  return data.data ?? [];
}

export async function getDanhSachHoaDonPaged(params: {
  trangThai?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<HoaDon>> {
  const { data } = await apiClient.get<
    ApiResponse<PaginatedResult<HoaDon> | HoaDon[]>
  >("/hoa-don", { params });
  return toPaginatedResult<HoaDon>(data.data);
}

export async function getChiTietHoaDon(maHoaDon: string): Promise<HoaDon> {
  const { data } = await apiClient.get<ApiResponse<HoaDon>>(
    `/hoa-don/${maHoaDon}`,
  );
  return data.data!;
}

export async function thanhToanHoaDon(
  maHoaDon: string,
  phuongThucTT?: PhuongThucThanhToan,
): Promise<HoaDon> {
  const { data } = await apiClient.patch<ApiResponse<HoaDon>>(
    `/hoa-don/${maHoaDon}/thanh-toan`,
    phuongThucTT ? { phuongThucTT } : {},
  );
  return data.data!;
}

export async function taoLinkThanhToanVNPay(
  maHoaDon: string,
): Promise<VnpayCreatePaymentData> {
  const { data } = await apiClient.post<ApiResponse<VnpayCreatePaymentData>>(
    `/payment/vnpay/${maHoaDon}/create`,
  );
  return data.data!;
}

export async function taoLinkThanhToanVNPayCongKhai(
  maHoaDon: string,
): Promise<VnpayCreatePaymentData> {
  const { data } = await apiClient.post<ApiResponse<VnpayCreatePaymentData>>(
    `/payment/vnpay/public/${maHoaDon}/create`,
  );
  return data.data!;
}

export async function xuLyVnpayReturn(
  rawQuery: string,
): Promise<{ success: boolean; message?: string; data?: VnpayReturnData }> {
  const query = rawQuery.startsWith("?") ? rawQuery.slice(1) : rawQuery;
  const { data } = await apiClient.get<
    ApiResponse<VnpayReturnData> & { success: boolean }
  >(`/payment/vnpay/return?${query}`);
  return {
    success: Boolean((data as any).success),
    message: data.message,
    data: data.data,
  };
}

export async function xuatHoaDonHtml(maHoaDon: string): Promise<Blob> {
  const response = await apiClient.get(`/hoa-don/${maHoaDon}/xuat`, {
    responseType: "blob",
  });
  return response.data as Blob;
}

export function getCustomerInvoiceExportUrlByTxnRef(txnRef: string): string {
  return `${getApiBaseUrl()}/payment/vnpay/${txnRef}/invoice`;
}

// ============================================================
// KHÁCH HÀNG API
// ============================================================

export async function getDanhSachKhachHang(
  search?: string,
): Promise<KhachHang[]> {
  const { data } = await apiClient.get<ApiResponse<KhachHang[]>>(
    "/khach-hang",
    {
      params: search ? { search } : {},
    },
  );
  return data.data ?? [];
}

export async function getChiTietKhachHang(id: string): Promise<KhachHang> {
  const { data } = await apiClient.get<ApiResponse<KhachHang>>(
    `/khach-hang/${id}`,
  );
  return data.data!;
}

// ============================================================
// DỌN PHÒNG
// ============================================================

export async function donDepPhong(soPhong: string): Promise<Phong> {
  const { data } = await apiClient.patch<ApiResponse<Phong>>(
    `/phong/${soPhong}/don-dep`,
  );
  return data.data!;
}

// ============================================================
// LOẠI PHÒNG API
// ============================================================

export async function getDanhSachLoaiPhong(): Promise<LoaiPhong[]> {
  const { data } = await apiClient.get<ApiResponse<LoaiPhong[]>>("/loai-phong");
  return data.data ?? [];
}

export async function getDanhSachLoaiPhongPaged(params: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PaginatedResult<LoaiPhong>> {
  const { data } = await apiClient.get<
    ApiResponse<PaginatedResult<LoaiPhong> | LoaiPhong[]>
  >("/loai-phong", { params });
  return toPaginatedResult<LoaiPhong>(data.data);
}

export async function getChiTietLoaiPhong(id: string): Promise<LoaiPhong> {
  const { data } = await apiClient.get<ApiResponse<LoaiPhong>>(
    `/loai-phong/${id}`,
  );
  return data.data!;
}

type LoaiPhongMutationPayload = {
  tenLoai: string;
  moTa?: string | null;
  sucChua?: number;
  soGiuong?: number;
  dienTich?: number;
  tienNghi?: string | null;
  albumAnh?: string | null;
};

export async function createLoaiPhong(
  payload: LoaiPhongMutationPayload,
): Promise<LoaiPhong> {
  const { data } = await apiClient.post<ApiResponse<LoaiPhong>>(
    "/loai-phong",
    payload,
  );
  return data.data!;
}

export async function updateLoaiPhong(
  id: string,
  payload: Partial<LoaiPhongMutationPayload>,
): Promise<LoaiPhong> {
  const { data } = await apiClient.put<ApiResponse<LoaiPhong>>(
    `/loai-phong/${id}`,
    payload,
  );
  return data.data!;
}

export async function deleteLoaiPhong(id: string): Promise<void> {
  await apiClient.delete(`/loai-phong/${id}`);
}

// ============================================================
// DỊCH VỤ API
// ============================================================

export async function getDanhSachDichVu(tatCa = false): Promise<DichVu[]> {
  const { data } = await apiClient.get<ApiResponse<DichVu[]>>("/dich-vu", {
    params: tatCa ? { tatCa: "true" } : {},
  });
  return data.data ?? [];
}

export async function createDichVu(
  payload: Pick<DichVu, "tenDichVu" | "donGia" | "donVi"> & { moTa?: string },
): Promise<DichVu> {
  const { data } = await apiClient.post<ApiResponse<DichVu>>(
    "/dich-vu",
    payload,
  );
  return data.data!;
}

export async function updateDichVu(
  id: string,
  payload: Partial<Omit<DichVu, "idDichVu">>,
): Promise<DichVu> {
  const { data } = await apiClient.put<ApiResponse<DichVu>>(
    `/dich-vu/${id}`,
    payload,
  );
  return data.data!;
}

export async function getDichVuCuaPhieu(
  maDatPhong: string,
): Promise<{ data: ChiTietDichVu[]; tongTienDichVu: number }> {
  const { data } = await apiClient.get<
    ApiResponse<ChiTietDichVu[]> & { tongTienDichVu: number }
  >(`/dich-vu/phieu/${maDatPhong}`);
  return {
    data: data.data ?? [],
    tongTienDichVu: (data as any).tongTienDichVu ?? 0,
  };
}

export async function themDichVuVaoPhieu(
  maDatPhong: string,
  idDichVu: string,
  soLuong: number,
): Promise<ChiTietDichVu> {
  const { data } = await apiClient.post<ApiResponse<ChiTietDichVu>>(
    `/dich-vu/phieu/${maDatPhong}`,
    { idDichVu, soLuong },
  );
  return data.data!;
}

// ============================================================
// ĐỐI TÁC B2B API
// ============================================================

export async function getDanhSachDoiTac(): Promise<DoiTac[]> {
  const { data } = await apiClient.get<ApiResponse<DoiTac[]>>("/doi-tac");
  return data.data ?? [];
}

export async function getChiTietDoiTac(id: string): Promise<DoiTac> {
  const { data } = await apiClient.get<ApiResponse<DoiTac>>(`/doi-tac/${id}`);
  return data.data!;
}

export async function createDoiTac(
  payload: Pick<DoiTac, "tenDoiTac" | "email"> &
    Partial<Pick<DoiTac, "sdt" | "diaChi" | "tyLeChietKhau" | "ghiChu">>,
): Promise<DoiTac> {
  const { data } = await apiClient.post<ApiResponse<DoiTac>>(
    "/doi-tac",
    payload,
  );
  return data.data!;
}

export async function updateDoiTac(
  id: string,
  payload: Partial<Omit<DoiTac, "idDoiTac" | "email" | "apiKey">>,
): Promise<DoiTac> {
  const { data } = await apiClient.put<ApiResponse<DoiTac>>(
    `/doi-tac/${id}`,
    payload,
  );
  return data.data!;
}

export async function generateApiKeyDoiTac(
  id: string,
): Promise<{ apiKey: string }> {
  const { data } = await apiClient.post<ApiResponse<{ apiKey: string }>>(
    `/doi-tac/${id}/api-key`,
  );
  return data.data!;
}
