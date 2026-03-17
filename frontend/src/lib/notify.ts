import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import type { ApiResponse } from "@/types";

type NotifyLevel = "success" | "error" | "warning" | "info";

interface NotifyOptions {
  id?: string;
  description?: string;
  duration?: number;
  cooldownMs?: number;
  dedupe?: boolean;
}

interface NotifyApiErrorOptions {
  id?: string;
  fallbackMessage?: string;
  notify401?: boolean;
  notify?: boolean;
}

const DEFAULT_COOLDOWN_MS = 3000;
const DEFAULT_DURATION: Record<NotifyLevel, number> = {
  success: 3200,
  info: 3600,
  warning: 4200,
  error: 4500,
};

const shownAt = new Map<string, number>();

function isBrowser() {
  return typeof window !== "undefined";
}

function cleanupShownAt(now: number) {
  for (const [key, ts] of shownAt.entries()) {
    if (now - ts > 60_000) {
      shownAt.delete(key);
    }
  }
}

function shouldShowNotification(
  key: string,
  cooldownMs: number,
  dedupe: boolean,
): boolean {
  if (!dedupe) return true;

  const now = Date.now();
  cleanupShownAt(now);
  const previous = shownAt.get(key);

  if (previous && now - previous < cooldownMs) {
    return false;
  }

  shownAt.set(key, now);
  return true;
}

function notify(
  level: NotifyLevel,
  message: string,
  options: NotifyOptions = {},
) {
  if (!isBrowser()) return;

  const normalized = message?.trim();
  if (!normalized) return;

  const dedupeKey = options.id ?? `${level}:${normalized}`;
  const cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const dedupe = options.dedupe ?? true;

  if (!shouldShowNotification(dedupeKey, cooldownMs, dedupe)) {
    return;
  }

  const toastOptions = {
    id: options.id,
    description: options.description,
    duration: options.duration ?? DEFAULT_DURATION[level],
    className:
      "w-[90vw] text-sm line-clamp-2 " +
      "md:w-auto md:text-base md:line-clamp-none",
  };

  if (level === "success") {
    toast.success(normalized, toastOptions);
    return;
  }

  if (level === "warning") {
    toast.warning(normalized, toastOptions);
    return;
  }

  if (level === "info") {
    toast.info(normalized, toastOptions);
    return;
  }

  toast.error(normalized, toastOptions);
}

export function notifySuccess(message: string, options?: NotifyOptions) {
  notify("success", message, options);
}

export function notifyError(message: string, options?: NotifyOptions) {
  notify("error", message, options);
}

export function notifyWarning(message: string, options?: NotifyOptions) {
  notify("warning", message, options);
}

export function notifyInfo(message: string, options?: NotifyOptions) {
  notify("info", message, options);
}

function getFriendlyErrorMessage(
  err: AxiosError<ApiResponse<unknown>>,
  fallbackMessage: string,
): string {
  const status = err.response?.status;
  const apiMessage = err.response?.data?.message?.trim();
  const rawMessage = err.message?.trim() ?? "";

  if (status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  if (err.code === "ECONNABORTED" || /timeout/i.test(rawMessage)) {
    return "Máy chủ phản hồi chậm. Vui lòng thử lại sau ít phút.";
  }

  if (!err.response) {
    return "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";
  }

  return apiMessage || rawMessage || fallbackMessage;
}

export function notifyApiError(
  error: unknown,
  options: NotifyApiErrorOptions = {},
) {
  const fallbackMessage =
    options.fallbackMessage ?? "Có lỗi xảy ra. Vui lòng thử lại.";
  const shouldNotify = options.notify ?? true;

  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    const message = getFriendlyErrorMessage(error, fallbackMessage);
    const status = error.response?.status;

    if (status === 401) {
      if (shouldNotify && (options.notify401 ?? true)) {
        notifyWarning(message, {
          id: options.id ?? "auth-expired",
          cooldownMs: 5000,
        });
      }
      return message;
    }

    if (!shouldNotify) {
      return message;
    }

    notifyError(message, {
      id:
        options.id ??
        `api-${error.config?.method ?? "get"}-${error.config?.url ?? "unknown"}-${status ?? "network"}`,
      cooldownMs: 3500,
    });
    return message;
  }

  if (error instanceof Error) {
    const message = error.message?.trim() || fallbackMessage;
    if (shouldNotify) {
      notifyError(message, { id: options.id });
    }
    return message;
  }

  if (shouldNotify) {
    notifyError(fallbackMessage, { id: options.id });
  }
  return fallbackMessage;
}
