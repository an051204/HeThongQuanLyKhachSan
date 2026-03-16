import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Bắt đầu seeding dữ liệu...");

  // ============================================================
  // 1. TẠO 15 LOẠI PHÒNG
  // ============================================================

  const loaiPhongs = [
    {
      tenLoai: "Standard Single",
      moTa: "Phòng tiêu chuẩn với giường đơn, tiện nghi cơ bản",
      sucChua: 1,
      soGiuong: 1,
      dienTich: 20,
      tienNghi: JSON.stringify([
        "Giường đơn",
        "Phòng tắm riêng",
        "Máy lạnh",
        "TV 32 inch",
        "WiFi miễn phí",
        "Tủ lạnh",
        "Bàn làm việc",
      ]),
      albumAnh: JSON.stringify([
        "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/237371/pexels-photo-237371.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200",
      ]),
      giaPhong: "450000",
    },
    {
      tenLoai: "Standard Double",
      moTa: "Phòng tiêu chuẩn với giường đôi rộng, tiện nghi cơ bản",
      sucChua: 2,
      soGiuong: 1,
      dienTich: 25,
      tienNghi: JSON.stringify([
        "Giường đôi (Queen)",
        "Phòng tắm riêng",
        "Máy lạnh",
        "TV 40 inch",
        "WiFi miễn phí",
        "Tủ lạnh",
        "Bàn làm việc",
        "Ghế ngồi",
      ]),
      albumAnh: JSON.stringify([
        "https://images.pexels.com/photos/276671/pexels-photo-276671.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/172872/pexels-photo-172872.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=1200",
      ]),
      giaPhong: "550000",
    },
    {
      tenLoai: "Standard Twin",
      moTa: "Phòng tiêu chuẩn với 2 giường đơn, tiện nghi cơ bản",
      sucChua: 2,
      soGiuong: 2,
      dienTich: 28,
      tienNghi: JSON.stringify([
        "2 giường đơn",
        "Phòng tắm riêng",
        "Máy lạnh",
        "TV 40 inch",
        "WiFi miễn phí",
        "Tủ lạnh",
        "Bàn làm việc",
      ]),
      albumAnh: JSON.stringify([
        "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/237371/pexels-photo-237371.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200",
      ]),
      giaPhong: "575000",
    },
    {
      tenLoai: "Deluxe Single",
      moTa: "Phòng cao cấp với giường đơn, tiện nghi sang trọng",
      sucChua: 1,
      soGiuong: 1,
      dienTich: 28,
      tienNghi: JSON.stringify([
        "Giường đơn (cao cấp)",
        "Phòng tắm với bồn tắm",
        "Máy lạnh cao cấp",
        "TV 43 inch Smart",
        "WiFi cao tốc miễn phí",
        "Tủ lạnh mini bar",
        "Bàn làm việc hiện đại",
        "Nước uống miễn phí",
      ]),
      albumAnh: JSON.stringify([
        "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/276671/pexels-photo-276671.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/172872/pexels-photo-172872.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=1200",
      ]),
      giaPhong: "650000",
    },
    {
      tenLoai: "Deluxe Double",
      moTa: "Phòng cao cấp với giường đôi rộng, tiện nghi sang trọng",
      sucChua: 2,
      soGiuong: 1,
      dienTich: 35,
      tienNghi: JSON.stringify([
        "Giường đôi King (cao cấp)",
        "Phòng tắm với bồn tắm",
        "Máy lạnh cao cấp",
        "TV 50 inch Smart",
        "WiFi cao tốc miễn phí",
        "Tủ lạnh mini bar",
        "Sofa",
        "Bàn làm việc hiện đại",
        "Nước uống miễn phí",
      ]),
      albumAnh: JSON.stringify([
        "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/237371/pexels-photo-237371.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?auto=compress&cs=tinysrgb&w=1200",
      ]),
      giaPhong: "750000",
    },
    {
      tenLoai: "Deluxe Twin",
      moTa: "Phòng cao cấp với 2 giường đơn, tiện nghi sang trọng",
      sucChua: 2,
      soGiuong: 2,
      dienTich: 38,
      tienNghi: JSON.stringify([
        "2 giường đơn (cao cấp)",
        "Phòng tắm với bồn tắm",
        "Máy lạnh cao cấp",
        "TV 50 inch Smart",
        "WiFi cao tốc miễn phí",
        "Tủ lạnh mini bar",
        "Sofa",
        "Bàn làm việc hiện đại",
      ]),
      albumAnh: JSON.stringify([
        "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/276671/pexels-photo-276671.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/172872/pexels-photo-172872.jpeg?auto=compress&cs=tinysrgb&w=1200",
      ]),
      giaPhong: "800000",
    },
    {
      tenLoai: "Superior Single",
      moTa: "Phòng cao cấp+ với view đẹp, giường đơn sang trọng",
      sucChua: 1,
      soGiuong: 1,
      dienTich: 32,
      tienNghi: JSON.stringify([
        "Giường đơn cao cấp",
        "Phòng tắm sang trọng với vòi sen mưa",
        "Máy lạnh tích hợp IoT",
        "TV 50 inch Smart",
        "WiFi cao tốc",
        "Tủ lạnh mini bar đầy đủ",
        "Bàn làm việc cao cấp",
        "Kính lớn với view đẹp",
        "Nước uống & bánh kẹo miễn phí",
      ]),
      albumAnh: JSON.stringify([
        "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/237371/pexels-photo-237371.jpeg?auto=compress&cs=tinysrgb&w=1200",
      ]),
      giaPhong: "850000",
    },
    {
      tenLoai: "Superior Double",
      moTa: "Phòng cao cấp+ với view đẹp, giường đôi sang trọng",
      sucChua: 2,
      soGiuong: 1,
      dienTich: 42,
      tienNghi: JSON.stringify([
        "Giường đôi King cao cấp",
        "Phòng tắm sang trọng với bồn tắm & vòi sen mưa",
        "Máy lạnh tích hợp IoT",
        "TV 55 inch Smart",
        "WiFi cao tốc",
        "Tủ lạnh mini bar đầy đủ",
        "Sofa da cao cấp",
        "Bàn làm việc cao cấp",
        "Kính lớn với view đẹp",
        "Nước uống & bánh kẹo miễn phí",
      ]),
      albumAnh: JSON.stringify([
        "https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/276671/pexels-photo-276671.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200",
      ]),
      giaPhong: "950000",
    },
    {
      tenLoai: "Superior Twin",
      moTa: "Phòng cao cấp+ với view đẹp, 2 giường đơn sang trọng",
      sucChua: 2,
      soGiuong: 2,
      dienTich: 45,
      tienNghi: JSON.stringify([
        "2 giường đơn cao cấp",
        "Phòng tắm sang trọng với bồn tắm & vòi sen mưa",
        "Máy lạnh tích hợp IoT",
        "TV 55 inch Smart",
        "WiFi cao tốc",
        "Tủ lạnh mini bar đầy đủ",
        "Sofa da cao cấp",
        "Bàn làm việc cao cấp",
        "Kính lớn với view đẹp",
      ]),
      albumAnh: JSON.stringify([
        "https://images.pexels.com/photos/172872/pexels-photo-172872.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200",
      ]),
      giaPhong: "1000000",
    },
    {
      tenLoai: "Suite Standard",
      moTa: "Phòng suite với phòng khách riêng, tiện nghi đầy đủ",
      sucChua: 3,
      soGiuong: 1,
      dienTich: 55,
      tienNghi: JSON.stringify([
        "Giường đôi King trong phòng ngủ",
        "Phòng khách riêng với sofa",
        "Phòng tắm hoàn thiện với bồn tắm",
        "TV 55 inch Smart ở phòng đủ & phòng khách",
        "WiFi cao tốc",
        "Tủ lạnh mini bar đầy đủ",
        "Bàn làm việc",
        "Dụng cụ pha trà/cà phê",
        "Nước uống & bánh kẹo miễn phí",
      ]),
      albumAnh: JSON.stringify([
        "https://images.pexels.com/photos/237371/pexels-photo-237371.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200",
      ]),
      giaPhong: "1200000",
    },
    {
      tenLoai: "Suite Deluxe",
      moTa: "Phòng suite cao cấp với phòng khách rộng, tiện nghi quốc tế",
      sucChua: 4,
      soGiuong: 2,
      dienTich: 72,
      tienNghi: JSON.stringify([
        "Giường đôi King + giường đơn trong phòng ngủ",
        "Phòng khách rộng với sofa cao cấp",
        "Phòng làm việc riêng",
        "Phòng tắm sang trọng với bồn tắm sục & vòi sen mưa",
        "TV 60 inch Smart ở phòng ngủ, phòng khách, phòng làm việc",
        "WiFi cao tốc",
        "Tủ lạnh mini bar đầy đủ",
        "Dụng cụ pha trà/cà phê sang trọng",
        "Nước uống & bánh kẹo đặc biệt",
      ]),
      albumAnh: JSON.stringify([
        "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/276671/pexels-photo-276671.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/172872/pexels-photo-172872.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=1200",
      ]),
      giaPhong: "1500000",
    },
    {
      tenLoai: "Suite Junior",
      moTa: "Phòng suite nhỏ gọn với phòng khách mở, phù hợp cặp đôi",
      sucChua: 2,
      soGiuong: 1,
      dienTich: 48,
      tienNghi: JSON.stringify([
        "Giường đôi King",
        "Phòng khách mở với sofa",
        "Phòng tắm với bồn tắm",
        "TV 55 inch Smart",
        "WiFi cao tốc",
        "Tủ lạnh mini bar đầy đủ",
        "Dụng cụ pha trà/cà phê",
        "Rose petals & hoa trang trí",
      ]),
      albumAnh: JSON.stringify([
        "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/237371/pexels-photo-237371.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200",
      ]),
      giaPhong: "1100000",
    },
    {
      tenLoai: "Family Room",
      moTa: "Phòng gia đình với không gian rộng, 2-3 giường, tiện nghi đầy đủ",
      sucChua: 4,
      soGiuong: 3,
      dienTich: 65,
      tienNghi: JSON.stringify([
        "Giường đôi King + 2 giường đơn",
        "Phòng tắm hoàn thiện với bồn tắm",
        "TV 55 inch Smart",
        "WiFi cao tốc",
        "Tủ lạnh mini bar",
        "Khu vực chơi cho trẻ",
        "Sofa thoải mái",
        "Bàn ăn",
        "Nước uống & bánh kẹo miễn phí",
      ]),
      albumAnh: JSON.stringify([
        "https://images.pexels.com/photos/276671/pexels-photo-276671.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/172872/pexels-photo-172872.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=1200",
      ]),
      giaPhong: "1300000",
    },
    {
      tenLoai: "Presidential Suite",
      moTa: "Phòng suite tổng thống với tiện nghi hạng sang, view panorama thành phố",
      sucChua: 4,
      soGiuong: 2,
      dienTich: 120,
      tienNghi: JSON.stringify([
        "Phòng ngủ chính với giường đôi King siêu sang",
        "Phòng ngủ phụ với giường đôi",
        "Phòng khách rộng sang trọng",
        "Phòng làm việc cao cấp",
        "Phòng ăn riêng",
        "2 phòng tắm (1 chính, 1 phụ) với bồn tắm sục, vòi sen mưa, tủ đôi",
        "TV 70 inch Smart ở các phòng",
        "Hệ thống âm thanh surround",
        "WiFi cao tốc",
        "Tủ lạnh mini bar đầy đủ cao cấp",
        "Nước uống & quà tặng đặc biệt",
        "View panorama thành phố",
      ]),
      albumAnh: JSON.stringify([
        "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/237371/pexels-photo-237371.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200",
      ]),
      giaPhong: "2500000",
    },
    {
      tenLoai: "Penthouse Suite",
      moTa: "Phòng penthouse sang trọng nhất, tầng cao, view toàn thành phố, tiện nghi vip",
      sucChua: 4,
      soGiuong: 2,
      dienTich: 150,
      tienNghi: JSON.stringify([
        "Phòng ngủ chính với giường đôi King quốc tế",
        "Phòng ngủ phụ sang trọng",
        "Phòng khách rộng view toàn thành phố",
        "Phòng làm việc cao cấp",
        "Phòng ăn riêng với bàn ăn gỗ quý",
        "Phòng bar nhỏ",
        "Đèn theo dõi thực tế",
        "2 phòng tắm hoàn thiện (bồn tắm sục, vòi sen mưa, tủ đôi)",
        "Sauna & phòng xông hơi riêng",
        "TV 75 inch ở các phòng",
        "Hệ thống âm thanh cao cấp surround 7.1",
        "WiFi 6 cao tốc",
        "Tủ lạnh mini bar VIP",
        "Butler service",
        "View panorama 360 độ thành phố",
      ]),
      albumAnh: JSON.stringify([
        "https://images.pexels.com/photos/276671/pexels-photo-276671.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/172872/pexels-photo-172872.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=1200",
      ]),
      giaPhong: "3500000",
    },
  ];

  console.log("📝 Tạo 15 loại phòng...");
  const createdLoaiPhongs = [];
  for (const loai of loaiPhongs) {
    const created = await prisma.loaiPhong.upsert({
      where: { tenLoai: loai.tenLoai },
      update: {},
      create: {
        tenLoai: loai.tenLoai,
        moTa: loai.moTa,
        sucChua: loai.sucChua,
        soGiuong: loai.soGiuong,
        dienTich: loai.dienTich,
        tienNghi: loai.tienNghi,
        albumAnh: loai.albumAnh,
      },
    });
    createdLoaiPhongs.push(created);
    console.log(`  ✓ ${created.tenLoai}`);
  }

  // ============================================================
  // 2. TẠO 30 PHÒNG
  // ============================================================

  console.log("\n🛏️  Tạo 30 phòng...");

  // Phân bổ phòng theo loại (3 tầng, 10 phòng/tầng)
  const roomAllocations = [
    // Tầng 1 (10 phòng)
    { tang: 1, loai: "Standard Single", so: "101" },
    { tang: 1, loai: "Standard Single", so: "102" },
    { tang: 1, loai: "Standard Double", so: "103" },
    { tang: 1, loai: "Standard Double", so: "104" },
    { tang: 1, loai: "Standard Twin", so: "105" },
    { tang: 1, loai: "Deluxe Single", so: "106" },
    { tang: 1, loai: "Deluxe Double", so: "107" },
    { tang: 1, loai: "Deluxe Twin", so: "108" },
    { tang: 1, loai: "Superior Single", so: "109" },
    { tang: 1, loai: "Superior Double", so: "110" },

    // Tầng 2 (10 phòng)
    { tang: 2, loai: "Standard Single", so: "201" },
    { tang: 2, loai: "Standard Double", so: "202" },
    { tang: 2, loai: "Standard Twin", so: "203" },
    { tang: 2, loai: "Deluxe Single", so: "204" },
    { tang: 2, loai: "Deluxe Double", so: "205" },
    { tang: 2, loai: "Deluxe Twin", so: "206" },
    { tang: 2, loai: "Superior Single", so: "207" },
    { tang: 2, loai: "Superior Double", so: "208" },
    { tang: 2, loai: "Superior Twin", so: "209" },
    { tang: 2, loai: "Suite Standard", so: "210" },

    // Tầng 3 (10 phòng)
    { tang: 3, loai: "Standard Double", so: "301" },
    { tang: 3, loai: "Standard Twin", so: "302" },
    { tang: 3, loai: "Deluxe Double", so: "303" },
    { tang: 3, loai: "Deluxe Twin", so: "304" },
    { tang: 3, loai: "Superior Single", so: "305" },
    { tang: 3, loai: "Superior Double", so: "306" },
    { tang: 3, loai: "Superior Twin", so: "307" },
    { tang: 3, loai: "Suite Deluxe", so: "308" },
    { tang: 3, loai: "Family Room", so: "309" },
    { tang: 3, loai: "Presidential Suite", so: "310" },

    // Tầng 4 (1 phòng - Penthouse)
    { tang: 4, loai: "Penthouse Suite", so: "401" },
  ];

  for (const alloc of roomAllocations) {
    const loaiPhong = createdLoaiPhongs.find((lp) => lp.tenLoai === alloc.loai);
    if (!loaiPhong) {
      console.error(`❌ Không tìm thấy loại phòng: ${alloc.loai}`);
      continue;
    }

    // Lấy giá từ tên loại (từ loaiPhongs array)
    const loaiConfig = loaiPhongs.find((lp) => lp.tenLoai === alloc.loai);
    const giaPhong = parseFloat(loaiConfig!.giaPhong);

    const created = await prisma.phong.upsert({
      where: { soPhong: alloc.so },
      update: {},
      create: {
        soPhong: alloc.so,
        idLoaiPhong: loaiPhong.idLoaiPhong,
        tang: alloc.tang,
        giaPhong: giaPhong,
        tinhTrang: "Trong",
        moTa: `Phòng ${alloc.loai} tầng ${alloc.tang}`,
      },
    });
    console.log(
      `  ✓ Phòng ${alloc.so} (${alloc.loai}) - Giá: ${giaPhong.toLocaleString("vi-VN")} VNĐ`,
    );
  }

  console.log("\n✅ Seeding hoàn thành!");
  console.log(`   📊 Tạo ${createdLoaiPhongs.length} loại phòng`);
  console.log(`   🛏️  Tạo ${roomAllocations.length} phòng`);
}

main()
  .catch((e) => {
    console.error("❌ Lỗi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
