"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  BedDouble,
  Star,
  ChevronRight,
  Users,
  Square,
  X,
  SlidersHorizontal,
  Images,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDanhSachLoaiPhong, getPhongTrong } from "@/lib/api";
import { useAppToast } from "@/hooks/useAppToast";
import { formatVND, tinhSoDem } from "@/lib/utils";
import type { LoaiPhong, Phong, TimKiemPhongInput } from "@/types";

type LoaiPhongOption = {
  value: string;
  label: string;
};

type SizeFilter = "" | "small" | "medium" | "large";

const DEFAULT_ROOM_GALLERY = [
  "https://images.pexels.com/photos/279805/pexels-photo-279805.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/271743/pexels-photo-271743.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const ROOM_GALLERY_BY_TYPE: Record<string, string[]> = {
  "standard single": [
    "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/237371/pexels-photo-237371.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "standard double": [
    "https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/276671/pexels-photo-276671.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "superior queen": [
    "https://images.pexels.com/photos/172872/pexels-photo-172872.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "deluxe king balcony": [
    "https://images.pexels.com/photos/2351290/pexels-photo-2351290.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/6585751/pexels-photo-6585751.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/6585764/pexels-photo-6585764.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "junior suite": [
    "https://images.pexels.com/photos/8082235/pexels-photo-8082235.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/5860693/pexels-photo-5860693.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/5379175/pexels-photo-5379175.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
};

function parseListField(raw?: string | null): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    return raw
      .split(/,|\n|;/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getRoomGallery(loaiPhong?: LoaiPhong): string[] {
  if (!loaiPhong) {
    return DEFAULT_ROOM_GALLERY;
  }

  const customGallery = parseListField(loaiPhong?.albumAnh);
  if (customGallery.length > 0) {
    // Filter out invalid URLs
    return customGallery.filter((url) => {
      if (!url) return false;
      // Check if it's a valid URL or data URL
      return url.startsWith("http") || url.startsWith("data:");
    });
  }

  const normalized = loaiPhong?.tenLoai?.trim().toLowerCase();
  if (normalized && ROOM_GALLERY_BY_TYPE[normalized]) {
    return ROOM_GALLERY_BY_TYPE[normalized];
  }

  return DEFAULT_ROOM_GALLERY;
}

function parseAmenities(tienNghi?: string | null): string[] {
  return parseListField(tienNghi);
}

function getDisplayDescription(phong: Phong): string | undefined {
  const roomDescription = phong.moTa?.trim();
  const typeDescription = phong.loaiPhong?.moTa?.trim();

  if (roomDescription && !/\s-\sphong\s\d+$/i.test(roomDescription)) {
    return roomDescription;
  }

  return typeDescription ?? roomDescription;
}

function getAreaScaleLabel(area?: number): string {
  if (!area) return "";
  if (area < 22) return "Cỡ nhỏ";
  if (area < 35) return "Cỡ vừa";
  return "Cỡ lớn";
}

function getAreaBucket(area?: number): SizeFilter {
  if (!area) return "";
  if (area < 22) return "small";
  if (area < 35) return "medium";
  return "large";
}

export default function FrmTimKiemPhong() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const [form, setForm] = useState<TimKiemPhongInput>({
    ngayDen: today,
    ngayDi: tomorrow,
    loaiPhong: "",
    sucChuaMin: "",
    kichCo: "",
    soGiuongMin: "",
    giaTu: "",
    giaDen: "",
  });
  const [phongList, setPhongList] = useState<Phong[]>([]);
  const [loaiPhongCatalog, setLoaiPhongCatalog] = useState<LoaiPhong[]>([]);
  const [loaiPhongOptions, setLoaiPhongOptions] = useState<LoaiPhongOption[]>([
    { value: "", label: "Tất cả loại phòng" },
  ]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedPhong, setSelectedPhong] = useState<Phong | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { error } = useAppToast();

  useEffect(() => {
    async function fetchLoaiPhong() {
      try {
        const list = await getDanhSachLoaiPhong();
        setLoaiPhongCatalog(list);
        setLoaiPhongOptions([
          { value: "", label: "Tất cả loại phòng" },
          ...list.map((item) => ({ value: item.tenLoai, label: item.tenLoai })),
        ]);
      } catch {
        setLoaiPhongCatalog([]);
        setLoaiPhongOptions([{ value: "", label: "Tất cả loại phòng" }]);
      }
    }

    void fetchLoaiPhong();
  }, []);

  const amenityOptions = useMemo(() => {
    return Array.from(
      new Set(
        loaiPhongCatalog.flatMap((item) => parseAmenities(item.tienNghi)),
      ),
    ).slice(0, 12);
  }, [loaiPhongCatalog]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function toggleAmenity(amenity: string) {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((item) => item !== amenity)
        : [...prev, amenity],
    );
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    if (form.ngayDi <= form.ngayDen) {
      error("Ngày đi phải sau ngày đến.");
      return;
    }

    setLoading(true);
    try {
      const data = await getPhongTrong({
        ...form,
        tienNghi: selectedAmenities,
      });
      setPhongList(data);
      setSearched(true);
    } catch (err) {
      error(err instanceof Error ? err.message : "Lỗi khi tìm phòng.");
    } finally {
      setLoading(false);
    }
  }

  function handleChonPhong(phong: Phong) {
    const params = new URLSearchParams({
      soPhong: phong.soPhong,
      loaiPhong: phong.loaiPhong?.tenLoai ?? "",
      giaPhong: String(phong.giaPhong),
      ngayDen: form.ngayDen,
      ngayDi: form.ngayDi,
    });
    router.push(`/dat-phong?${params.toString()}`);
  }

  const soDem = tinhSoDem(form.ngayDen, form.ngayDi);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-700 p-6 text-white">
            <div className="space-y-3">
              <Badge className="w-fit bg-white/15 text-white hover:bg-white/15">
                Đặt phòng trực tuyến
              </Badge>
              <h2 className="text-3xl font-bold leading-tight">
                Chọn đúng hạng phòng trước khi đặt
              </h2>
              <p className="max-w-xl text-sm text-slate-200">
                Xem trước ảnh, mô tả, diện tích, sức chứa và tiện ích để chọn
                đúng không gian phù hợp với chuyến đi của bạn.
              </p>
              <div className="flex flex-wrap gap-2 pt-2 text-xs text-slate-200">
                <span className="rounded-full bg-white/10 px-3 py-1">
                  Gallery ảnh chi tiết
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1">
                  Lọc theo sức chứa
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1">
                  Lọc theo diện tích
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1">
                  Lọc theo tiện ích
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1">
                  Lọc theo giá và số giường
                </span>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ngayDen">Ngày đến</Label>
                  <Input
                    id="ngayDen"
                    name="ngayDen"
                    type="date"
                    min={today}
                    value={form.ngayDen}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ngayDi">Ngày đi</Label>
                  <Input
                    id="ngayDi"
                    name="ngayDi"
                    type="date"
                    min={form.ngayDen || today}
                    value={form.ngayDi}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="loaiPhong">Loại phòng</Label>
                  <select
                    id="loaiPhong"
                    name="loaiPhong"
                    value={form.loaiPhong}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {loaiPhongOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sucChuaMin">Sức chứa tối thiểu</Label>
                  <select
                    id="sucChuaMin"
                    name="sucChuaMin"
                    value={form.sucChuaMin}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Không giới hạn</option>
                    <option value="1">1 khách</option>
                    <option value="2">2 khách</option>
                    <option value="3">3 khách</option>
                    <option value="4">4 khách trở lên</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="kichCo">Kích thước phòng</Label>
                  <select
                    id="kichCo"
                    name="kichCo"
                    value={form.kichCo}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tất cả kích thước</option>
                    <option value="small">Cỡ nhỏ</option>
                    <option value="medium">Cỡ vừa</option>
                    <option value="large">Cỡ lớn</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="soGiuongMin">Số giường tối thiểu</Label>
                  <select
                    id="soGiuongMin"
                    name="soGiuongMin"
                    value={form.soGiuongMin}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Không giới hạn</option>
                    <option value="1">Từ 1 giường</option>
                    <option value="2">Từ 2 giường</option>
                    <option value="3">Từ 3 giường</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="giaTu">Giá từ (VNĐ/đêm)</Label>
                  <Input
                    id="giaTu"
                    name="giaTu"
                    type="number"
                    min={0}
                    step={50000}
                    value={form.giaTu}
                    onChange={handleChange}
                    placeholder="500000"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="giaDen">Giá đến (VNĐ/đêm)</Label>
                  <Input
                    id="giaDen"
                    name="giaDen"
                    type="number"
                    min={0}
                    step={50000}
                    value={form.giaDen}
                    onChange={handleChange}
                    placeholder="2000000"
                  />
                </div>

                <div className="flex items-end md:col-span-2">
                  <Button
                    type="submit"
                    loading={loading}
                    size="lg"
                    className="w-full"
                  >
                    <Search className="h-4 w-4" />
                    Tìm phòng
                  </Button>
                </div>
              </div>

              {amenityOptions.length > 0 && (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                    Chọn tiện ích ưu tiên
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {amenityOptions.map((amenity) => {
                      const active = selectedAmenities.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => toggleAmenity(amenity)}
                          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                            active
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
                          }`}
                        >
                          {amenity}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                {soDem > 0 && (
                  <span>
                    Thời gian lưu trú:{" "}
                    <span className="font-semibold text-blue-600">
                      {soDem} đêm
                    </span>
                  </span>
                )}
                {selectedAmenities.length > 0 && (
                  <span>
                    Tiện ích đã chọn:{" "}
                    <span className="font-semibold text-blue-600">
                      {selectedAmenities.length}
                    </span>
                  </span>
                )}
              </div>
            </form>
          </CardContent>
        </div>
      </Card>

      {searched && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              {phongList.length > 0
                ? `Tìm thấy ${phongList.length} phòng trống phù hợp`
                : "Không tìm thấy phòng trống phù hợp"}
            </h2>
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              {form.kichCo && (
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  {form.kichCo === "small"
                    ? "Cỡ nhỏ"
                    : form.kichCo === "medium"
                      ? "Cỡ vừa"
                      : "Cỡ lớn"}
                </span>
              )}
              {form.sucChuaMin && (
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Từ {form.sucChuaMin} khách
                </span>
              )}
              {form.soGiuongMin && (
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Từ {form.soGiuongMin} giường
                </span>
              )}
              {form.giaTu && (
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Giá từ {formatVND(Number(form.giaTu))}
                </span>
              )}
              {form.giaDen && (
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Giá đến {formatVND(Number(form.giaDen))}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {phongList.map((phong) => (
              <PhongCard
                key={phong.soPhong}
                phong={phong}
                soDem={soDem}
                onChon={() => handleChonPhong(phong)}
                onXemChiTiet={() => setSelectedPhong(phong)}
              />
            ))}
          </div>
        </div>
      )}

      {selectedPhong && (
        <RoomDetailModal
          phong={selectedPhong}
          soDem={soDem}
          onClose={() => setSelectedPhong(null)}
          onChonPhong={() => {
            handleChonPhong(selectedPhong);
            setSelectedPhong(null);
          }}
        />
      )}
    </div>
  );
}

function PhongCard({
  phong,
  soDem,
  onChon,
  onXemChiTiet,
}: {
  phong: Phong;
  soDem: number;
  onChon: () => void;
  onXemChiTiet: () => void;
}) {
  const roomTypeName = phong.loaiPhong?.tenLoai;
  const gallery = getRoomGallery(phong.loaiPhong);
  const imageUrl = gallery[0];
  const amenities = parseAmenities(phong.loaiPhong?.tienNghi).slice(0, 4);
  const displayDescription = getDisplayDescription(phong);
  const capacity = phong.loaiPhong?.sucChua;
  const bedCount =
    phong.loaiPhong?.soGiuong ??
    (capacity ? Math.max(1, Math.ceil(capacity / 2)) : undefined);
  const area = phong.loaiPhong?.dienTich;

  return (
    <Card className="overflow-hidden border-slate-200 transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-48 overflow-hidden bg-slate-100">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 hover:scale-105"
          style={{ backgroundImage: `url('${imageUrl}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge className="bg-white/90 text-slate-800 hover:bg-white">
            {roomTypeName ?? "Phòng tiêu chuẩn"}
          </Badge>
          <Badge className="bg-slate-900/70 text-white hover:bg-slate-900/70">
            <Images className="h-3 w-3" /> {gallery.length} ảnh
          </Badge>
        </div>
        {!roomTypeName && (
          <div className="absolute inset-0 flex items-center justify-center">
            <BedDouble className="h-14 w-14 text-white/60" />
          </div>
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Phòng
            </p>
            <CardTitle className="text-2xl">{phong.soPhong}</CardTitle>
          </div>
          <Badge variant="success">Còn trống</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 py-2">
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Star className="h-3.5 w-3.5 text-amber-400" />
          <span>{roomTypeName ?? "Hạng phòng linh hoạt"}</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          {capacity ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
              <Users className="h-3.5 w-3.5" />
              {capacity} khách
            </span>
          ) : null}
          {bedCount ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
              <BedDouble className="h-3.5 w-3.5" />
              {bedCount} giường
            </span>
          ) : null}
          {area ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
              <Square className="h-3.5 w-3.5" />
              {area} m2
            </span>
          ) : null}
          {area ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-blue-700">
              {getAreaScaleLabel(area)}
            </span>
          ) : null}
        </div>
        {displayDescription && (
          <p
            className="line-clamp-3 text-sm text-gray-500"
            title={displayDescription}
          >
            {displayDescription}
          </p>
        )}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {amenities.map((amenity) => (
              <span
                key={amenity}
                className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600"
              >
                {amenity}
              </span>
            ))}
          </div>
        )}
        <div className="rounded-xl bg-blue-50 p-3 text-center">
          <p className="text-xs text-gray-500">Giá/đêm</p>
          <p className="text-lg font-bold text-blue-700">
            {formatVND(Number(phong.giaPhong))}
          </p>
          {soDem > 1 && (
            <p className="text-xs text-gray-500">
              {soDem} đêm ={" "}
              <span className="font-semibold">
                {formatVND(Number(phong.giaPhong) * soDem)}
              </span>
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="w-full" onClick={onXemChiTiet}>
            Xem chi tiết
          </Button>
          <Button className="w-full" onClick={onChon}>
            Đặt phòng
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function RoomDetailModal({
  phong,
  soDem,
  onClose,
  onChonPhong,
}: {
  phong: Phong;
  soDem: number;
  onClose: () => void;
  onChonPhong: () => void;
}) {
  const gallery = useMemo(
    () => getRoomGallery(phong.loaiPhong),
    [phong.loaiPhong],
  );
  const amenities = useMemo(
    () => parseAmenities(phong.loaiPhong?.tienNghi),
    [phong.loaiPhong?.tienNghi],
  );
  const bedCount =
    phong.loaiPhong?.soGiuong ??
    (phong.loaiPhong?.sucChua
      ? Math.max(1, Math.ceil(phong.loaiPhong.sucChua / 2))
      : undefined);
  const area = phong.loaiPhong?.dienTich;
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    setActiveImage(0);
  }, [phong.soPhong]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-[28px] bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="bg-slate-950 p-4 text-white">
            <div className="relative overflow-hidden rounded-2xl bg-slate-800">
              <div
                className="h-72 bg-cover bg-center md:h-[26rem]"
                style={{ backgroundImage: `url('${gallery[activeImage]}')` }}
              />
              <div className="absolute left-4 top-4 flex gap-2">
                <Badge className="bg-white/15 text-white hover:bg-white/15">
                  <Images className="h-3 w-3" /> {gallery.length} ảnh
                </Badge>
                <Badge className="bg-white/15 text-white hover:bg-white/15">
                  Phòng {phong.soPhong}
                </Badge>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-5">
              {gallery.map((imageUrl, index) => (
                <button
                  key={`${imageUrl}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`overflow-hidden rounded-xl border transition ${
                    activeImage === index
                      ? "border-cyan-300 shadow-lg shadow-cyan-500/20"
                      : "border-white/10 opacity-80 hover:opacity-100"
                  }`}
                >
                  <div
                    className="h-16 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url('${imageUrl}')` }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
                  Chi tiết phòng
                </p>
                <h3 className="mt-1 text-2xl font-bold text-gray-900">
                  {phong.loaiPhong?.tenLoai ?? "Phòng tiêu chuẩn"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Phòng {phong.soPhong}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-slate-100 p-2 text-gray-700 transition hover:bg-slate-200"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoPill
                label="Sức chứa"
                value={`${phong.loaiPhong?.sucChua ?? "?"} khách`}
              />
              <InfoPill
                label="Số giường"
                value={bedCount ? `${bedCount} giường` : "Chưa cập nhật"}
              />
              <InfoPill
                label="Diện tích"
                value={
                  area
                    ? `${area} m2 (${getAreaScaleLabel(area)})`
                    : "Chưa cập nhật"
                }
              />
              <InfoPill
                label="Giá mỗi đêm"
                value={formatVND(Number(phong.giaPhong))}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Mô tả
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                {getDisplayDescription(phong) ??
                  "Chưa có mô tả chi tiết cho phòng này."}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tiện ích nổi bật
              </p>
              {amenities.length > 0 ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {amenities.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-800"
                    >
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  Chưa cập nhật tiện ích.
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-blue-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-gray-500">
                    Tạm tính {Math.max(1, soDem)} đêm
                  </p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatVND(Number(phong.giaPhong) * Math.max(1, soDem))}
                  </p>
                </div>
                <Button onClick={onChonPhong} size="lg">
                  Chọn phòng này
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}
