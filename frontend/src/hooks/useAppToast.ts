"use client";

import { useCallback, useMemo } from "react";
import {
  notifyError,
  notifyInfo,
  notifySuccess,
  notifyWarning,
} from "@/lib/notify";

type ToastMessage = string;

interface ToastOptions {
  id?: string;
  description?: string;
  duration?: number;
  cooldownMs?: number;
}

export function useAppToast() {
  const success = useCallback(
    (message: ToastMessage, options?: ToastOptions) => {
      notifySuccess(message, options);
    },
    [],
  );

  const error = useCallback((message: ToastMessage, options?: ToastOptions) => {
    notifyError(message, options);
  }, []);

  const warning = useCallback(
    (message: ToastMessage, options?: ToastOptions) => {
      notifyWarning(message, options);
    },
    [],
  );

  const info = useCallback((message: ToastMessage, options?: ToastOptions) => {
    notifyInfo(message, options);
  }, []);

  return useMemo(
    () => ({
      success,
      error,
      warning,
      info,
    }),
    [success, error, warning, info],
  );
}
