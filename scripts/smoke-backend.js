const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const apiBaseUrl = (
  process.env.SMOKE_BASE_URL ??
  process.env.BACKEND_BASE_URL ??
  "http://localhost:4000/api"
).replace(/\/+$/, "");

const managerAccount = {
  hoTen: process.env.SMOKE_MANAGER_NAME ?? "Quan Ly Smoke Test",
  taiKhoan: process.env.SMOKE_MANAGER_USERNAME ?? "ql_smoke",
  matKhau: process.env.SMOKE_MANAGER_PASSWORD ?? "QuanLy@123",
  vaiTro: "QuanLy",
};

const receptionistAccount = {
  hoTen: process.env.SMOKE_RECEPTIONIST_NAME ?? "Le Tan Smoke Test",
  taiKhoan: process.env.SMOKE_RECEPTIONIST_USERNAME ?? "letan_smoke",
  matKhau: process.env.SMOKE_RECEPTIONIST_PASSWORD ?? "LeTan@123",
  vaiTro: "LeTan",
};

const accountantAccount = {
  hoTen: process.env.SMOKE_ACCOUNTANT_NAME ?? "Ke Toan Smoke Test",
  taiKhoan: process.env.SMOKE_ACCOUNTANT_USERNAME ?? "ketoan_smoke",
  matKhau: process.env.SMOKE_ACCOUNTANT_PASSWORD ?? "KeToan@123",
  vaiTro: "KeToan",
};

const housekeepingAccount = {
  hoTen: process.env.SMOKE_HOUSEKEEPING_NAME ?? "Buong Phong Smoke Test",
  taiKhoan: process.env.SMOKE_HOUSEKEEPING_USERNAME ?? "buongphong_smoke",
  matKhau: process.env.SMOKE_HOUSEKEEPING_PASSWORD ?? "BuongPhong@123",
  vaiTro: "BuongPhong",
};

const state = {
  bookingId: null,
  invoiceId: null,
  bookedRoomNumber: null,
  customerId: null,
  tempRoomNumber: null,
  tempFilterRoomNumber: null,
  tempLoaiPhongId: null,
  tempStaffUsernames: [],
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}

function todayIsoDate(offsetDays = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeSmokeKey() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
}

async function apiRequest({
  method = "GET",
  path,
  token,
  body,
  expectedStatus = 200,
}) {
  const headers = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let requestBody;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: requestBody,
  });

  const rawText = await response.text();
  let parsedBody = null;
  if (rawText) {
    try {
      parsedBody = JSON.parse(rawText);
    } catch {
      parsedBody = rawText;
    }
  }

  const expectedList = Array.isArray(expectedStatus)
    ? expectedStatus
    : [expectedStatus];

  if (!expectedList.includes(response.status)) {
    throw new Error(
      [
        `${method} ${path} expected ${expectedList.join("/")} but got ${response.status}`,
        rawText || "<empty response>",
      ].join("\n"),
    );
  }

  return {
    status: response.status,
    body: parsedBody,
  };
}

function requireSuccess(response, label) {
  assert(
    response.body && response.body.success === true,
    `${label} did not return success=true.`,
  );
  return response.body.data;
}

async function ensureStaffAccount(account) {
  const passwordHash = await bcrypt.hash(account.matKhau, 10);
  const existing = await prisma.nhanVien.findUnique({
    where: { taiKhoan: account.taiKhoan },
    select: { idNhanVien: true },
  });

  if (existing) {
    await prisma.nhanVien.update({
      where: { taiKhoan: account.taiKhoan },
      data: {
        hoTen: account.hoTen,
        vaiTro: account.vaiTro,
        matKhau: passwordHash,
        isActive: true,
      },
    });
    return;
  }

  await prisma.nhanVien.create({
    data: {
      hoTen: account.hoTen,
      taiKhoan: account.taiKhoan,
      matKhau: passwordHash,
      vaiTro: account.vaiTro,
      isActive: true,
    },
  });
}

async function cleanupSmokeData(state) {
  if (state.bookingId) {
    const invoices = await prisma.hoaDon.findMany({
      where: { maDatPhong: state.bookingId },
      select: { maHoaDon: true },
    });

    await prisma.hoaDon.deleteMany({ where: { maDatPhong: state.bookingId } });
    await prisma.chiTietDichVu.deleteMany({
      where: { maDatPhong: state.bookingId },
    });
    await prisma.phieuDatPhong.deleteMany({
      where: { maDatPhong: state.bookingId },
    });
  }

  if (state.bookedRoomNumber) {
    const bookedRoom = await prisma.phong.findUnique({
      where: { soPhong: state.bookedRoomNumber },
      select: { soPhong: true },
    });
    if (bookedRoom) {
      await prisma.phong.update({
        where: { soPhong: state.bookedRoomNumber },
        data: { tinhTrang: "Trong" },
      });
    }
  }

  if (state.customerId) {
    await prisma.khachHang.deleteMany({
      where: { idKhachHang: state.customerId },
    });
  }

  if (state.tempRoomNumber) {
    await prisma.phong.deleteMany({ where: { soPhong: state.tempRoomNumber } });
  }

  if (state.tempFilterRoomNumber) {
    await prisma.phong.deleteMany({
      where: { soPhong: state.tempFilterRoomNumber },
    });
  }

  if (state.tempLoaiPhongId) {
    await prisma.loaiPhong.deleteMany({
      where: { idLoaiPhong: state.tempLoaiPhongId },
    });
  }

  if (state.tempStaffUsernames.length > 0) {
    await prisma.nhanVien.deleteMany({
      where: { taiKhoan: { in: state.tempStaffUsernames } },
    });
  }
}

async function main() {
  const verified = [];
  const smokeKey = makeSmokeKey();
  state.tempRoomNumber = `SMK${smokeKey.slice(-5)}`;

  await ensureStaffAccount(managerAccount);
  await ensureStaffAccount(receptionistAccount);
  await ensureStaffAccount(accountantAccount);
  await ensureStaffAccount(housekeepingAccount);

  const healthResponse = await apiRequest({
    path: "/health",
    expectedStatus: 200,
  });
  assert(
    healthResponse.body && healthResponse.body.status === "ok",
    "Backend health check failed.",
  );

  const managerLogin = await apiRequest({
    method: "POST",
    path: "/auth/login",
    body: {
      taiKhoan: managerAccount.taiKhoan,
      matKhau: managerAccount.matKhau,
    },
    expectedStatus: 200,
  });
  const managerData = requireSuccess(managerLogin, "manager login");
  const managerToken = managerData.token;
  assert(managerToken, "Manager login did not return token.");
  verified.push("manager_login");

  const receptionistLogin = await apiRequest({
    method: "POST",
    path: "/auth/login",
    body: {
      taiKhoan: receptionistAccount.taiKhoan,
      matKhau: receptionistAccount.matKhau,
    },
    expectedStatus: 200,
  });
  const receptionistData = requireSuccess(
    receptionistLogin,
    "receptionist login",
  );
  const receptionistToken = receptionistData.token;
  assert(receptionistToken, "Receptionist login did not return token.");
  verified.push("receptionist_login");

  const accountantLogin = await apiRequest({
    method: "POST",
    path: "/auth/login",
    body: {
      taiKhoan: accountantAccount.taiKhoan,
      matKhau: accountantAccount.matKhau,
    },
    expectedStatus: 200,
  });
  const accountantData = requireSuccess(accountantLogin, "accountant login");
  const accountantToken = accountantData.token;
  assert(accountantToken, "Accountant login did not return token.");
  verified.push("accountant_login");

  const housekeepingLogin = await apiRequest({
    method: "POST",
    path: "/auth/login",
    body: {
      taiKhoan: housekeepingAccount.taiKhoan,
      matKhau: housekeepingAccount.matKhau,
    },
    expectedStatus: 200,
  });
  const housekeepingData = requireSuccess(
    housekeepingLogin,
    "housekeeping login",
  );
  const housekeepingToken = housekeepingData.token;
  assert(housekeepingToken, "Housekeeping login did not return token.");
  verified.push("housekeeping_login");

  const managerMe = await apiRequest({
    path: "/auth/me",
    token: managerToken,
    expectedStatus: 200,
  });
  assert(
    requireSuccess(managerMe, "manager auth/me").vaiTro === "QuanLy",
    "Manager auth/me returned wrong role.",
  );
  verified.push("manager_auth_me");

  const receptionistMe = await apiRequest({
    path: "/auth/me",
    token: receptionistToken,
    expectedStatus: 200,
  });
  assert(
    requireSuccess(receptionistMe, "receptionist auth/me").vaiTro === "LeTan",
    "Receptionist auth/me returned wrong role.",
  );
  verified.push("receptionist_auth_me");

  const accountantMe = await apiRequest({
    path: "/auth/me",
    token: accountantToken,
    expectedStatus: 200,
  });
  assert(
    requireSuccess(accountantMe, "accountant auth/me").vaiTro === "KeToan",
    "Accountant auth/me returned wrong role.",
  );
  verified.push("accountant_auth_me");

  const housekeepingMe = await apiRequest({
    path: "/auth/me",
    token: housekeepingToken,
    expectedStatus: 200,
  });
  assert(
    requireSuccess(housekeepingMe, "housekeeping auth/me").vaiTro ===
      "BuongPhong",
    "Housekeeping auth/me returned wrong role.",
  );
  verified.push("housekeeping_auth_me");

  const staffList = await apiRequest({
    path: "/auth/nhan-vien",
    token: managerToken,
    expectedStatus: 200,
  });
  const staffData = requireSuccess(staffList, "manager staff list");
  assert(
    Array.isArray(staffData),
    "Manager staff list did not return an array.",
  );
  verified.push("manager_staff_list");

  const statsResponse = await apiRequest({
    path: "/thong-ke/tong-quan",
    token: managerToken,
    expectedStatus: 200,
  });
  const statsData = requireSuccess(statsResponse, "manager stats");
  assert(
    statsData.phong && typeof statsData.phong.tong === "number",
    "Manager stats payload is incomplete.",
  );
  assert(
    statsData.phanTichKeToan &&
      Array.isArray(statsData.phanTichKeToan.xuHuongDoanhThu7Ngay) &&
      statsData.phanTichKeToan.xuHuongDoanhThu7Ngay.length === 7,
    "Manager stats missing accounting trend payload.",
  );
  assert(
    statsData.hieuSuatBuongPhong &&
      Array.isArray(statsData.hieuSuatBuongPhong.xuHuong7Ngay) &&
      statsData.hieuSuatBuongPhong.xuHuong7Ngay.length === 7,
    "Manager stats missing housekeeping trend payload.",
  );
  verified.push("manager_stats");

  const blockedManagerRegister = await apiRequest({
    method: "POST",
    path: "/auth/register",
    token: managerToken,
    body: {
      hoTen: "Blocked QuanLy",
      taiKhoan: `blocked_ql_${smokeKey.slice(-6)}`,
      matKhau: "Blocked123",
      vaiTro: "QuanLy",
    },
    expectedStatus: [403, 422],
  });
  assert(
    blockedManagerRegister.status === 422 ||
      blockedManagerRegister.status === 403,
    "Manager registration restriction check failed.",
  );
  verified.push("manager_register_quanly_blocked");

  const tempStaffUsername = `kt_tmp_${smokeKey.slice(-6)}`;
  const createAccountantViaRegister = await apiRequest({
    method: "POST",
    path: "/auth/register",
    token: managerToken,
    body: {
      hoTen: "Ke Toan Temp",
      taiKhoan: tempStaffUsername,
      matKhau: "TempPass123",
      vaiTro: "KeToan",
    },
    expectedStatus: 201,
  });
  assert(
    requireSuccess(createAccountantViaRegister, "manager register accountant")
      .vaiTro === "KeToan",
    "Manager register should allow KeToan role.",
  );
  state.tempStaffUsernames.push(tempStaffUsername);
  verified.push("manager_register_ketoan_allowed");

  const firstRoomType = await prisma.loaiPhong.findFirst({
    orderBy: { tenLoai: "asc" },
    select: { idLoaiPhong: true },
  });
  assert(firstRoomType, "No room type found for room CRUD smoke test.");

  const smokeTypeName = `Smoke Type ${smokeKey.slice(-6)}`;
  const createSmokeType = await apiRequest({
    method: "POST",
    path: "/loai-phong",
    token: managerToken,
    body: {
      tenLoai: smokeTypeName,
      moTa: "Smoke room type for filter/parser test",
      sucChua: 4,
      soGiuong: 3,
      dienTich: 42,
      tienNghi: "Wifi 6\nBan cong",
      albumAnh:
        "https://example.com/smoke-1.jpg\nhttps://example.com/smoke-2.jpg",
    },
    expectedStatus: 201,
  });
  const smokeTypeData = requireSuccess(
    createSmokeType,
    "manager create room type",
  );
  state.tempLoaiPhongId = smokeTypeData.idLoaiPhong;

  const parsedGallery = JSON.parse(smokeTypeData.albumAnh || "[]");
  const parsedAmenities = JSON.parse(smokeTypeData.tienNghi || "[]");
  assert(
    Array.isArray(parsedGallery) &&
      parsedGallery.length === 2 &&
      parsedGallery[0].includes("smoke-1.jpg"),
    "Loai phong gallery parser did not normalize albumAnh correctly.",
  );
  assert(
    Array.isArray(parsedAmenities) && parsedAmenities.includes("Wifi 6"),
    "Loai phong amenities parser did not normalize tienNghi correctly.",
  );
  verified.push("manager_room_type_parser_gallery");

  state.tempFilterRoomNumber = `SMF${smokeKey.slice(-5)}`;
  const createFilterRoom = await apiRequest({
    method: "POST",
    path: "/phong",
    token: managerToken,
    body: {
      soPhong: state.tempFilterRoomNumber,
      idLoaiPhong: state.tempLoaiPhongId,
      tang: 8,
      giaPhong: 750000,
      moTa: "Smoke filter room",
    },
    expectedStatus: 201,
  });
  assert(
    requireSuccess(createFilterRoom, "manager create filter room").soPhong ===
      state.tempFilterRoomNumber,
    "Filter room create failed.",
  );

  const encodedType = encodeURIComponent(smokeTypeName);
  const encodedAmenities = encodeURIComponent("Wifi 6,Ban cong");
  const filteredRooms = await apiRequest({
    path: `/phong/trong?ngayDen=${todayIsoDate(0)}&ngayDi=${todayIsoDate(1)}&loaiPhong=${encodedType}&soGiuongMin=3&giaTu=700000&giaDen=800000&tienNghi=${encodedAmenities}`,
    expectedStatus: 200,
  });
  const filteredRoomsData = requireSuccess(
    filteredRooms,
    "public room search with filters",
  );
  assert(
    Array.isArray(filteredRoomsData) &&
      filteredRoomsData.some(
        (room) => room.soPhong === state.tempFilterRoomNumber,
      ),
    "Room search filter (gia/giuong/tien nghi) did not return expected room.",
  );

  const strictPriceRooms = await apiRequest({
    path: `/phong/trong?ngayDen=${todayIsoDate(0)}&ngayDi=${todayIsoDate(1)}&loaiPhong=${encodedType}&soGiuongMin=3&giaDen=500000`,
    expectedStatus: 200,
  });
  const strictPriceData = requireSuccess(
    strictPriceRooms,
    "public room search strict price",
  );
  assert(
    Array.isArray(strictPriceData) &&
      !strictPriceData.some(
        (room) => room.soPhong === state.tempFilterRoomNumber,
      ),
    "Room search price filter should exclude expensive room.",
  );
  verified.push("public_room_search_filters_price_beds_amenities");

  const pagedRoomList = await apiRequest({
    path: "/phong?page=1&pageSize=5&search=SMF",
    expectedStatus: 200,
  });
  const pagedRoomData = requireSuccess(pagedRoomList, "room paged list");
  assert(
    Array.isArray(pagedRoomData.items) &&
      typeof pagedRoomData.pagination?.totalItems === "number",
    "Room paged list response is missing items/pagination.",
  );

  const pagedTypeList = await apiRequest({
    path: "/loai-phong?page=1&pageSize=5&search=Smoke%20Type",
    expectedStatus: 200,
  });
  const pagedTypeData = requireSuccess(pagedTypeList, "room type paged list");
  assert(
    Array.isArray(pagedTypeData.items) &&
      typeof pagedTypeData.pagination?.totalItems === "number",
    "Loai phong paged list response is missing items/pagination.",
  );
  verified.push("room_and_type_pagination_search");

  const createRoom = await apiRequest({
    method: "POST",
    path: "/phong",
    token: managerToken,
    body: {
      soPhong: state.tempRoomNumber,
      idLoaiPhong: firstRoomType.idLoaiPhong,
      tang: 9,
      giaPhong: 999999,
      moTa: "Smoke test room",
    },
    expectedStatus: 201,
  });
  assert(
    requireSuccess(createRoom, "manager room create").soPhong ===
      state.tempRoomNumber,
    "Room create returned wrong room number.",
  );

  const updateRoom = await apiRequest({
    method: "PUT",
    path: `/phong/${state.tempRoomNumber}`,
    token: managerToken,
    body: {
      tang: 10,
      giaPhong: 888888,
      moTa: "Smoke test room updated",
    },
    expectedStatus: 200,
  });
  assert(
    requireSuccess(updateRoom, "manager room update").tang === 10,
    "Room update did not persist floor.",
  );

  await apiRequest({
    method: "DELETE",
    path: `/phong/${state.tempRoomNumber}`,
    token: managerToken,
    expectedStatus: 200,
  });
  state.tempRoomNumber = null;
  verified.push("manager_room_crud");

  await apiRequest({
    path: "/khach-hang",
    expectedStatus: 401,
  });
  verified.push("customer_list_protected");

  await apiRequest({
    path: "/dat-phong",
    expectedStatus: 401,
  });
  verified.push("booking_list_protected");

  const customerResponse = await apiRequest({
    method: "POST",
    path: "/khach-hang/upsert",
    body: {
      hoTen: `Smoke Guest ${smokeKey.slice(-4)}`,
      sdt: `09${smokeKey.slice(-8)}`,
      email: `smoke-${smokeKey}@example.com`,
      cccd_passport: `CCCD${smokeKey}`,
      diaChi: "Smoke Test Address",
    },
    expectedStatus: [200, 201],
  });
  const customerData = requireSuccess(customerResponse, "customer upsert");
  state.customerId = customerData.idKhachHang;
  assert(state.customerId, "Customer upsert did not return idKhachHang.");
  verified.push("public_customer_upsert");

  const availableRooms = await apiRequest({
    path: `/phong/trong?ngayDen=${todayIsoDate(0)}&ngayDi=${todayIsoDate(1)}`,
    expectedStatus: 200,
  });
  const availableRoomData = requireSuccess(
    availableRooms,
    "available room search",
  );
  assert(
    Array.isArray(availableRoomData) && availableRoomData.length > 0,
    "No available room found for booking smoke test.",
  );

  const bookedRoom =
    availableRoomData.find((room) => room.soPhong !== state.tempRoomNumber) ??
    availableRoomData[0];
  state.bookedRoomNumber = bookedRoom.soPhong;

  const bookingResponse = await apiRequest({
    method: "POST",
    path: "/dat-phong",
    body: {
      idKhachHang: state.customerId,
      soPhong: state.bookedRoomNumber,
      ngayDen: todayIsoDate(0),
      ngayDi: todayIsoDate(1),
      tienCoc: 200000,
    },
    expectedStatus: 201,
  });
  const bookingData = requireSuccess(bookingResponse, "public booking create");
  state.bookingId = bookingData.maDatPhong;
  assert(state.bookingId, "Booking create did not return maDatPhong.");
  verified.push("public_booking_create");

  const bookingPagedList = await apiRequest({
    path: `/dat-phong?page=1&pageSize=5&search=${state.bookingId.slice(-6)}`,
    token: receptionistToken,
    expectedStatus: 200,
  });
  const bookingPagedData = requireSuccess(
    bookingPagedList,
    "receptionist paged booking list",
  );
  assert(
    Array.isArray(bookingPagedData.items) &&
      typeof bookingPagedData.pagination?.totalItems === "number",
    "Booking paged list response is missing items/pagination.",
  );
  verified.push("booking_pagination_search");

  const confirmBooking = await apiRequest({
    method: "PATCH",
    path: `/dat-phong/${state.bookingId}/xac-nhan`,
    token: receptionistToken,
    expectedStatus: 200,
  });
  assert(
    requireSuccess(confirmBooking, "receptionist booking confirm").trangThai ===
      "DaXacNhan",
    "Booking confirm did not update status.",
  );
  verified.push("receptionist_booking_confirm");

  const checkInResponse = await apiRequest({
    method: "PATCH",
    path: `/check-in/${state.bookingId}`,
    token: receptionistToken,
    expectedStatus: 200,
  });
  assert(
    requireSuccess(checkInResponse, "receptionist checkin").trangThai ===
      "DaCheckIn",
    "Check-in did not update booking status.",
  );
  verified.push("receptionist_checkin");

  const checkOutResponse = await apiRequest({
    method: "PATCH",
    path: `/check-out/${state.bookingId}`,
    token: receptionistToken,
    body: { phuPhi: 50000 },
    expectedStatus: 200,
  });
  const checkOutData = requireSuccess(
    checkOutResponse,
    "receptionist checkout",
  );
  assert(
    checkOutData.hoaDon && checkOutData.hoaDon.maHoaDon,
    "Check-out did not create invoice.",
  );
  const invoiceId = checkOutData.hoaDon.maHoaDon;
  state.invoiceId = invoiceId;
  verified.push("receptionist_checkout");

  const invoiceList = await apiRequest({
    path: "/hoa-don",
    token: accountantToken,
    expectedStatus: 200,
  });
  const invoiceListData = requireSuccess(
    invoiceList,
    "accountant invoice list",
  );
  assert(
    Array.isArray(invoiceListData),
    "Invoice list did not return an array.",
  );
  assert(
    invoiceListData.some((invoice) => invoice.maHoaDon === invoiceId),
    "Invoice list does not contain the checkout invoice.",
  );
  verified.push("accountant_invoice_list");

  const invoicePagedList = await apiRequest({
    path: `/hoa-don?page=1&pageSize=5&search=${invoiceId.slice(-6)}`,
    token: accountantToken,
    expectedStatus: 200,
  });
  const invoicePagedData = requireSuccess(
    invoicePagedList,
    "accountant paged invoice list",
  );
  assert(
    Array.isArray(invoicePagedData.items) &&
      typeof invoicePagedData.pagination?.totalItems === "number",
    "Invoice paged list response is missing items/pagination.",
  );
  verified.push("invoice_pagination_search");

  const payInvoice = await apiRequest({
    method: "PATCH",
    path: `/hoa-don/${invoiceId}/thanh-toan`,
    token: accountantToken,
    expectedStatus: 200,
  });
  assert(
    requireSuccess(payInvoice, "accountant invoice pay").trangThai ===
      "DaThanhToan",
    "Accountant payment did not update invoice status.",
  );
  verified.push("accountant_invoice_pay");

  const exportInvoice = await apiRequest({
    path: `/hoa-don/${invoiceId}/xuat`,
    token: accountantToken,
    expectedStatus: 200,
  });
  assert(
    typeof exportInvoice.body === "string" &&
      exportInvoice.body.includes("<html"),
    "Invoice export did not return HTML content.",
  );
  verified.push("staff_invoice_export_html");

  const cleanRoom = await apiRequest({
    method: "PATCH",
    path: `/phong/${state.bookedRoomNumber}/don-dep`,
    token: housekeepingToken,
    expectedStatus: 200,
  });
  assert(
    requireSuccess(cleanRoom, "housekeeping room clean").tinhTrang === "Trong",
    "Room clean did not reset room state.",
  );
  verified.push("housekeeping_room_clean");

  await apiRequest({
    path: "/doi-tac",
    token: receptionistToken,
    expectedStatus: 403,
  });
  verified.push("receptionist_partner_forbidden");

  const managerPartnerList = await apiRequest({
    path: "/doi-tac",
    token: managerToken,
    expectedStatus: 200,
  });
  assert(
    Array.isArray(requireSuccess(managerPartnerList, "manager partner list")),
    "Manager partner list did not return an array.",
  );
  verified.push("manager_partner_list");

  console.log(
    JSON.stringify(
      {
        success: true,
        verified,
        bookingId: state.bookingId,
        invoiceId: state.invoiceId,
        room: state.bookedRoomNumber,
        manager: managerAccount.taiKhoan,
        receptionist: receptionistAccount.taiKhoan,
        accountant: accountantAccount.taiKhoan,
        housekeeping: housekeepingAccount.taiKhoan,
      },
      null,
      2,
    ),
  );
}

main()
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanupSmokeData(state);
    } catch (cleanupError) {
      console.error(
        cleanupError instanceof Error
          ? `Smoke cleanup failed: ${cleanupError.message}`
          : cleanupError,
      );
      process.exitCode = 1;
    }
    await prisma.$disconnect();
  });
