// src/components/ui/alert.tsx
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";
import { X } from "lucide-react";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success";
  onClose?: () => void;
}

const variantClasses = {
  default: "bg-blue-50 border-blue-200 text-blue-800",
  destructive: "bg-red-50 border-red-200 text-red-800",
  success: "bg-green-50 border-green-200 text-green-800",
};

export function Alert({
  className,
  variant = "default",
  onClose,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start justify-between rounded-lg border p-4 text-sm",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-3 shrink-0 opacity-60 hover:opacity-100"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
