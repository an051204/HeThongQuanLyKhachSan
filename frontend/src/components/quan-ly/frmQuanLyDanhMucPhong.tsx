"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Building2,
  BedDouble,
  Images,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppToast } from "@/hooks/useAppToast";
import {
  getAllPhongPaged,
  createPhong,
  updatePhong,
  deletePhong,
  getDanhSachLoaiPhongPaged,
  getDanhSachLoaiPhong,
  createLoaiPhong,
  updateLoaiPhong,
  deleteLoaiPhong,
} from "@/lib/api";
import { formatVND, TINH_TRANG_LABEL } from "@/lib/utils";
import type { Phong, LoaiPhong, PaginationMeta } from "@/types";

type TinhTrangBadge =
  | "success"
  | "warning"
  | "destructive"
  | "outline"
  | "default";

const TINH_TRANG_BADGE: Record<string, TinhTrangBadge> = {
  Trong: "success",
  DaDuocDat: "default",
  DangSuDung: "warning",
  CanDonDep: "destructive",
};

const EMPTY_ROOM_FORM = {
  soPhong: "",
  idLoaiPhong: "",
  tang: "",
  giaPhong: "",
  moTa: "",
};

const EMPTY_TYPE_FORM = {
  tenLoai: "",
  moTa: "",
  sucChua: "2",
  soGiuong: "1",
  dienTich: "",
  tienNghi: "",
  albumAnh: "",
};

const ROOM_PAGE_SIZE = 8;
const TYPE_PAGE_SIZE = 8;
const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};

const MAX_GALLERY_IMAGES = 12;
const MAX_IMAGE_EDGE = 1600;
const COMPRESS_QUALITY = 0.82;
const DATA_URL_PREFIX = /^data:image\/[a-zA-Z0-9.+-]+;base64,/i;
const DATA_URL_HEAD_ONLY = /^data:image\/[a-zA-Z0-9.+-]+$/i;

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Không đọc được file ảnh."));
    reader.readAsDataURL(file);
  });
}

async function compressDataUrlImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const maxEdge = Math.max(image.width, image.height);
      const scale = maxEdge > MAX_IMAGE_EDGE ? MAX_IMAGE_EDGE / maxEdge : 1;

      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Không thể xử lý ảnh để tối ưu dung lượng."));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", COMPRESS_QUALITY));
    };

    image.onerror = () => reject(new Error("Không thể xử lý ảnh đã chọn."));
    image.src = dataUrl;
  });
}

async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Chỉ hỗ trợ file ảnh.");
  }

  const rawDataUrl = await readFileAsDataUrl(file);

  // Ảnh lớn sẽ được nén trước khi lưu để tránh payload quá nặng.
  if (file.size > 300 * 1024) {
    return compressDataUrlImage(rawDataUrl);
  }

  return rawDataUrl;
}

function parseListField(raw?: string | null): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const list = parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
      return repairFragmentedDataUrls(list);
    }
  } catch {
    return repairFragmentedDataUrls(splitTextList(raw));
  }

  return [];
}

function parseListFieldForForm(raw?: string | null): string {
  return parseListField(raw).join("\n");
}

function normalizeListInput(input: string): string | null {
  const list = Array.from(
    new Set(repairFragmentedDataUrls(splitTextList(input))),
  );

  if (list.length === 0) return null;
  return JSON.stringify(list);
}

function repairFragmentedDataUrls(items: string[]): string[] {
  const repaired: string[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const current = items[index]?.trim();
    if (!current) continue;

    const next = items[index + 1]?.trim();
    const next2 = items[index + 2]?.trim();

    if (
      DATA_URL_HEAD_ONLY.test(current) &&
      /^base64$/i.test(next ?? "") &&
      next2
    ) {
      repaired.push(`${current};base64,${next2}`);
      index += 2;
      continue;
    }

    repaired.push(current);
  }

  return repaired;
}

function splitTextList(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  if (normalized.includes("\n")) {
    return normalized
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        if (DATA_URL_PREFIX.test(line)) return [line];
        return line
          .split(/[;,]/)
          .map((item) => item.trim())
          .filter(Boolean);
      });
  }

  if (DATA_URL_PREFIX.test(normalized)) {
    return [normalized];
  }

  return normalized
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function FrmQuanLyDanhMucPhong() {
  const [phongList, setPhongList] = useState<Phong[]>([]);
  const [loaiPhongList, setLoaiPhongList] = useState<LoaiPhong[]>([]);
  const [loaiPhongCatalog, setLoaiPhongCatalog] = useState<LoaiPhong[]>([]);
  const [roomPagination, setRoomPagination] =
    useState<PaginationMeta>(EMPTY_PAGINATION);
  const [typePagination, setTypePagination] =
    useState<PaginationMeta>(EMPTY_PAGINATION);
  const [roomSearch, setRoomSearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("");
  const [roomPage, setRoomPage] = useState(1);
  const [typePage, setTypePage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Phong | null>(null);
  const [editTypeTarget, setEditTypeTarget] = useState<LoaiPhong | null>(null);
  const [roomForm, setRoomForm] = useState(EMPTY_ROOM_FORM);
  const [typeForm, setTypeForm] = useState(EMPTY_TYPE_FORM);
  const [savingRoom, setSavingRoom] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const { success, error } = useAppToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [phongPaged, loaiPhongPaged, loaiPhongAll] = await Promise.all([
        getAllPhongPaged({
          page: roomPage,
          pageSize: ROOM_PAGE_SIZE,
          search: roomSearch.trim() || undefined,
        }),
        getDanhSachLoaiPhongPaged({
          page: typePage,
          pageSize: TYPE_PAGE_SIZE,
          search: typeSearch.trim() || undefined,
        }),
        getDanhSachLoaiPhong(),
      ]);
      setPhongList(phongPaged.items);
      setRoomPagination(phongPaged.pagination);
      setLoaiPhongList(loaiPhongPaged.items);
      setTypePagination(loaiPhongPaged.pagination);
      setLoaiPhongCatalog(loaiPhongAll);
    } catch (err) {
      error(err instanceof Error ? err.message : "Lỗi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [error, roomPage, typePage, roomSearch, typeSearch]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    setRoomPage(1);
  }, [roomSearch]);

  useEffect(() => {
    setTypePage(1);
  }, [typeSearch]);

  const tongAnhLoaiPhong = useMemo(
    () =>
      loaiPhongCatalog.reduce(
        (total, item) => total + parseListField(item.albumAnh).length,
        0,
      ),
    [loaiPhongCatalog],
  );

  const previewImages = useMemo(
    () => parseListField(typeForm.albumAnh),
    [typeForm.albumAnh],
  );

  function openCreate() {
    setEditTarget(null);
    setRoomForm(EMPTY_ROOM_FORM);
    setShowRoomForm(true);
  }

  function openEdit(phong: Phong) {
    setEditTarget(phong);
    setRoomForm({
      soPhong: phong.soPhong,
      idLoaiPhong: phong.idLoaiPhong,
      tang: phong.tang ? String(phong.tang) : "",
      giaPhong: String(phong.giaPhong),
      moTa: phong.moTa ?? "",
    });
    setShowRoomForm(true);
  }

  function openCreateType() {
    setEditTypeTarget(null);
    setTypeForm(EMPTY_TYPE_FORM);
    setShowTypeForm(true);
  }

  function openEditType(loaiPhong: LoaiPhong) {
    setEditTypeTarget(loaiPhong);
    setTypeForm({
      tenLoai: loaiPhong.tenLoai,
      moTa: loaiPhong.moTa ?? "",
      sucChua: String(loaiPhong.sucChua ?? 2),
      soGiuong: String(loaiPhong.soGiuong ?? 1),
      dienTich:
        loaiPhong.dienTich !== undefined && loaiPhong.dienTich !== null
          ? String(loaiPhong.dienTich)
          : "",
      tienNghi: parseListFieldForForm(loaiPhong.tienNghi),
      albumAnh: parseListFieldForForm(loaiPhong.albumAnh),
    });
    setShowTypeForm(true);
  }

  async function handleSaveRoom() {
    if (!roomForm.soPhong || !roomForm.idLoaiPhong || !roomForm.giaPhong) {
      error("Vui lòng điền đầy đủ thông tin bắt buộc.");
      return;
    }

    const normalizedSoPhong = roomForm.soPhong.trim();
    if (!/^\d{3}$/.test(normalizedSoPhong)) {
      error("Số phòng phải gồm đúng 3 chữ số (ví dụ: 101, 210).");
      return;
    }

    const normalizedTang = roomForm.tang.trim();
    if (
      normalizedTang &&
      /^\d+$/.test(normalizedTang) &&
      normalizedTang.length === 1 &&
      !normalizedSoPhong.startsWith(normalizedTang)
    ) {
      error("Số phòng nên bắt đầu bằng số tầng tương ứng.");
      return;
    }

    setSavingRoom(true);
    try {
      const payload = {
        soPhong: normalizedSoPhong,
        idLoaiPhong: roomForm.idLoaiPhong,
        tang: roomForm.tang ? Number(roomForm.tang) : undefined,
        giaPhong: Number(roomForm.giaPhong),
        moTa: roomForm.moTa || undefined,
      };

      if (editTarget) {
        await updatePhong(editTarget.soPhong, payload);
      } else {
        await createPhong(payload as Omit<Phong, "tinhTrang">);
      }

      setShowRoomForm(false);
      await fetchData();
      success(
        editTarget
          ? `Đã cập nhật phòng ${normalizedSoPhong}.`
          : `Đã thêm phòng ${normalizedSoPhong}.`,
      );
    } catch (err) {
      error(err instanceof Error ? err.message : "Lưu thất bại.");
    } finally {
      setSavingRoom(false);
    }
  }

  async function handleSaveType() {
    if (!typeForm.tenLoai.trim()) {
      error("Tên loại phòng là bắt buộc.");
      return;
    }

    setSavingType(true);
    try {
      const payload = {
        tenLoai: typeForm.tenLoai.trim(),
        moTa: typeForm.moTa.trim() || undefined,
        sucChua: Number(typeForm.sucChua || 2),
        soGiuong: Number(typeForm.soGiuong || 1),
        dienTich: typeForm.dienTich ? Number(typeForm.dienTich) : undefined,
        tienNghi: normalizeListInput(typeForm.tienNghi),
        albumAnh: normalizeListInput(typeForm.albumAnh),
      };

      if (editTypeTarget) {
        await updateLoaiPhong(editTypeTarget.idLoaiPhong, payload);
      } else {
        await createLoaiPhong(payload);
      }

      setShowTypeForm(false);
      await fetchData();
      success(
        editTypeTarget
          ? `Đã cập nhật loại phòng ${typeForm.tenLoai.trim()}.`
          : `Đã thêm loại phòng ${typeForm.tenLoai.trim()}.`,
      );
    } catch (err) {
      error(err instanceof Error ? err.message : "Lưu loại phòng thất bại.");
    } finally {
      setSavingType(false);
    }
  }

  async function handleDelete(soPhong: string) {
    if (!confirm(`Xác nhận xóa phòng ${soPhong}?`)) return;
    try {
      await deletePhong(soPhong);
      await fetchData();
      success(`Đã xóa phòng ${soPhong}.`);
    } catch (err) {
      error(err instanceof Error ? err.message : "Xóa thất bại.");
    }
  }

  async function handleDeleteType(idLoaiPhong: string, tenLoai: string) {
    if (!confirm(`Xác nhận xóa loại phòng ${tenLoai}?`)) return;
    try {
      await deleteLoaiPhong(idLoaiPhong);
      await fetchData();
      success(`Đã xóa loại phòng ${tenLoai}.`);
    } catch (err) {
      error(err instanceof Error ? err.message : "Xóa loại phòng thất bại.");
    }
  }

  async function handleUploadGalleryImages(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    if (previewImages.length + files.length > MAX_GALLERY_IMAGES) {
      error(`Tối đa ${MAX_GALLERY_IMAGES} ảnh cho mỗi loại phòng.`);
      e.target.value = "";
      return;
    }

    setUploadingImages(true);
    try {
      const urls = await Promise.all(files.map((file) => fileToDataUrl(file)));
      const merged = [...previewImages, ...urls];
      setTypeForm((prev) => ({ ...prev, albumAnh: merged.join("\n") }));
      success(`Đã thêm ${urls.length} ảnh vào gallery.`);
    } catch (err) {
      error(err instanceof Error ? err.message : "Upload ảnh thất bại.");
    } finally {
      setUploadingImages(false);
      e.target.value = "";
    }
  }

  function handleRemovePreviewImage(imageUrl: string) {
    const next = previewImages.filter((item) => item !== imageUrl);
    setTypeForm((prev) => ({ ...prev, albumAnh: next.join("\n") }));
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-800 text-white">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">
                  Quan ly hien thi phong
                </p>
                <h2 className="text-2xl font-bold">
                  Tinh chinh phong va loai phong
                </h2>
                <p className="max-w-2xl text-sm text-slate-200">
                  Cap nhat mo ta, tien nghi, suc chua, gallery anh va gia de
                  trang tim phong cua khach hien thi dung tinh than tung hang
                  phong.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={openCreateType}>
                  <Building2 className="h-4 w-4" /> Them loai phong
                </Button>
                <Button
                  className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                  onClick={openCreate}
                >
                  <Plus className="h-4 w-4" /> Them phong
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <SummaryCard
            icon={<Building2 className="h-4 w-4 text-cyan-700" />}
            label="Loai phong"
            value={String(typePagination.totalItems)}
            description="Danh muc dang hien thi"
          />
          <SummaryCard
            icon={<BedDouble className="h-4 w-4 text-blue-700" />}
            label="Phong thuc te"
            value={String(roomPagination.totalItems)}
            description="Phong dang quan ly"
          />
          <SummaryCard
            icon={<Images className="h-4 w-4 text-amber-700" />}
            label="Anh gallery"
            value={String(tongAnhLoaiPhong)}
            description="Anh phong dang luu"
          />
        </div>
      </div>

      {showTypeForm && (
        <Card className="border-cyan-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-cyan-600" />
              {editTypeTarget
                ? `Sửa loại phòng ${editTypeTarget.tenLoai}`
                : "Thêm loại phòng mới"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tên loại phòng *</Label>
                <Input
                  value={typeForm.tenLoai}
                  onChange={(e) =>
                    setTypeForm((prev) => ({
                      ...prev,
                      tenLoai: e.target.value,
                    }))
                  }
                  placeholder="Deluxe King Balcony"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sức chứa</Label>
                <Input
                  type="number"
                  min={1}
                  value={typeForm.sucChua}
                  onChange={(e) =>
                    setTypeForm((prev) => ({
                      ...prev,
                      sucChua: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Số giường</Label>
                <Input
                  type="number"
                  min={1}
                  value={typeForm.soGiuong}
                  onChange={(e) =>
                    setTypeForm((prev) => ({
                      ...prev,
                      soGiuong: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Diện tích (m2)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.5"
                  value={typeForm.dienTich}
                  onChange={(e) =>
                    setTypeForm((prev) => ({
                      ...prev,
                      dienTich: e.target.value,
                    }))
                  }
                  placeholder="35"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Mô tả hiển thị</Label>
                <textarea
                  value={typeForm.moTa}
                  onChange={(e) =>
                    setTypeForm((prev) => ({ ...prev, moTa: e.target.value }))
                  }
                  rows={3}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Phòng rộng rãi, có ban công riêng và khu tắm đứng lớn..."
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Tiện nghi</Label>
                <textarea
                  value={typeForm.tienNghi}
                  onChange={(e) =>
                    setTypeForm((prev) => ({
                      ...prev,
                      tienNghi: e.target.value,
                    }))
                  }
                  rows={3}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Wifi 6&#10;Smart TV 55 inch&#10;Ban cong rieng"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Gallery ảnh</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Images className="h-4 w-4" />
                    {uploadingImages ? "Đang tải ảnh..." : "Tải ảnh từ máy"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleUploadGalleryImages}
                      disabled={uploadingImages}
                    />
                  </label>
                  <p className="text-xs text-gray-500">
                    Có thể tải trực tiếp hoặc dán URL bên dưới.
                  </p>
                </div>
                <textarea
                  value={typeForm.albumAnh}
                  onChange={(e) =>
                    setTypeForm((prev) => ({
                      ...prev,
                      albumAnh: e.target.value,
                    }))
                  }
                  rows={4}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://.../phong-1.jpg&#10;https://.../phong-2.jpg"
                />
                <p className="text-xs text-gray-500">
                  Mỗi dòng là một URL ảnh. Khách sẽ thấy gallery này trong chi
                  tiết phòng.
                </p>
              </div>
            </div>

            {previewImages.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Xem trước ảnh
                </p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {previewImages.slice(0, 8).map((imageUrl) => (
                    <div
                      key={imageUrl}
                      className="overflow-hidden rounded-xl border bg-slate-100"
                    >
                      <div
                        className="h-24 w-full bg-cover bg-center"
                        style={{ backgroundImage: `url('${imageUrl}')` }}
                      />
                      <div className="flex items-center justify-between gap-2 px-2 py-1">
                        <p className="truncate text-[11px] text-gray-500">
                          {imageUrl.startsWith("data:image/")
                            ? "Ảnh upload"
                            : imageUrl}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemovePreviewImage(imageUrl)}
                          className="rounded px-1 py-0.5 text-[11px] text-red-600 hover:bg-red-50"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button loading={savingType} onClick={handleSaveType}>
                <Check className="h-4 w-4" /> Lưu loại phòng
              </Button>
              <Button variant="outline" onClick={() => setShowTypeForm(false)}>
                <X className="h-4 w-4" /> Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showRoomForm && (
        <Card className="border-blue-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              {editTarget
                ? `Sửa phòng ${editTarget.soPhong}`
                : "Thêm phòng mới"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Số phòng *</Label>
                <Input
                  value={roomForm.soPhong}
                  onChange={(e) =>
                    setRoomForm((f) => ({ ...f, soPhong: e.target.value }))
                  }
                  maxLength={3}
                  inputMode="numeric"
                  pattern="[0-9]{3}"
                  disabled={!!editTarget}
                  placeholder="101"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Loại phòng *</Label>
                <select
                  value={roomForm.idLoaiPhong}
                  onChange={(e) =>
                    setRoomForm((f) => ({ ...f, idLoaiPhong: e.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn loại --</option>
                  {loaiPhongCatalog.map((l) => (
                    <option key={l.idLoaiPhong} value={l.idLoaiPhong}>
                      {l.tenLoai}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Tầng</Label>
                <Input
                  type="number"
                  min={1}
                  value={roomForm.tang}
                  onChange={(e) =>
                    setRoomForm((f) => ({ ...f, tang: e.target.value }))
                  }
                  placeholder="1"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Giá phòng/đêm (VNĐ) *</Label>
                <Input
                  type="number"
                  min={0}
                  step={50000}
                  value={roomForm.giaPhong}
                  onChange={(e) =>
                    setRoomForm((f) => ({ ...f, giaPhong: e.target.value }))
                  }
                  placeholder="850000"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Mô tả riêng cho phòng</Label>
                <textarea
                  value={roomForm.moTa}
                  onChange={(e) =>
                    setRoomForm((f) => ({ ...f, moTa: e.target.value }))
                  }
                  rows={3}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Phòng góc yên tĩnh, gần thang máy riêng..."
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button loading={savingRoom} onClick={handleSaveRoom}>
                <Check className="h-4 w-4" /> Lưu phòng
              </Button>
              <Button variant="outline" onClick={() => setShowRoomForm(false)}>
                <X className="h-4 w-4" /> Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-cyan-600" /> Danh mục loại
              phòng hiển thị cho khách
            </CardTitle>
            <Input
              value={typeSearch}
              onChange={(e) => setTypeSearch(e.target.value)}
              placeholder="Tìm theo tên loại, mô tả, tiện nghi..."
              className="w-full md:max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4">
            <p className="text-xs text-gray-500">
              Trang {typePagination.page}/{typePagination.totalPages} • Tổng{" "}
              {typePagination.totalItems} loại phòng
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!typePagination.hasPreviousPage || loading}
                onClick={() => setTypePage((prev) => Math.max(1, prev - 1))}
              >
                Trang trước
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!typePagination.hasNextPage || loading}
                onClick={() => setTypePage((prev) => prev + 1)}
              >
                Trang sau
              </Button>
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Đang tải...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    {[
                      "Loại",
                      "Sức chứa",
                      "Giường",
                      "Diện tích",
                      "Tiện nghi",
                      "Gallery",
                      "Mô tả",
                      "",
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loaiPhongList.map((loai) => {
                    const amenities = parseListField(loai.tienNghi);
                    const gallery = parseListField(loai.albumAnh);

                    return (
                      <tr
                        key={loai.idLoaiPhong}
                        className="align-top hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 font-semibold">
                          {loai.tenLoai}
                        </td>
                        <td className="px-4 py-3">{loai.sucChua} khách</td>
                        <td className="px-4 py-3">
                          {loai.soGiuong ?? 1} giường
                        </td>
                        <td className="px-4 py-3">
                          {loai.dienTich ? `${loai.dienTich} m2` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex max-w-xs flex-wrap gap-1.5">
                            {amenities.length > 0 ? (
                              amenities.slice(0, 4).map((item) => (
                                <span
                                  key={item}
                                  className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600"
                                >
                                  {item}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {gallery.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="h-12 w-16 rounded-lg bg-cover bg-center bg-no-repeat"
                                style={{
                                  backgroundImage: gallery[0]
                                    ? `url('${gallery[0]}')`
                                    : "none",
                                  backgroundColor: "#e2e8f0",
                                }}
                                title={gallery[0] || "Không có ảnh"}
                              />
                              <span className="text-xs text-gray-500">
                                {gallery.length} ảnh
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Không có ảnh
                            </span>
                          )}
                        </td>
                        <td className="max-w-xs px-4 py-3 text-gray-500">
                          {loai.moTa ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditType(loai)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700"
                              onClick={() =>
                                handleDeleteType(loai.idLoaiPhong, loai.tenLoai)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BedDouble className="h-4 w-4 text-blue-600" /> Danh sách phòng
              thực tế
            </CardTitle>
            <Input
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
              placeholder="Tìm theo số phòng, loại phòng, mô tả..."
              className="w-full md:max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4">
            <p className="text-xs text-gray-500">
              Trang {roomPagination.page}/{roomPagination.totalPages} • Tổng{" "}
              {roomPagination.totalItems} phòng
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!roomPagination.hasPreviousPage || loading}
                onClick={() => setRoomPage((prev) => Math.max(1, prev - 1))}
              >
                Trang trước
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!roomPagination.hasNextPage || loading}
                onClick={() => setRoomPage((prev) => prev + 1)}
              >
                Trang sau
              </Button>
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Đang tải...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    {[
                      "Số phòng",
                      "Tầng",
                      "Loại",
                      "Giá/đêm",
                      "Trạng thái",
                      "Mô tả",
                      "",
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {phongList.map((phong) => (
                    <tr key={phong.soPhong} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold">
                        {phong.soPhong}
                      </td>
                      <td className="px-4 py-3">{phong.tang ?? "—"}</td>
                      <td className="px-4 py-3">
                        {phong.loaiPhong?.tenLoai ?? phong.idLoaiPhong}
                      </td>
                      <td className="px-4 py-3 font-medium text-blue-700">
                        {formatVND(Number(phong.giaPhong))}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={TINH_TRANG_BADGE[phong.tinhTrang]}>
                          {TINH_TRANG_LABEL[phong.tinhTrang]}
                        </Badge>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-gray-500">
                        {phong.moTa ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(phong)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(phong.soPhong)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
          <div className="rounded-xl bg-slate-100 p-2">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
