// src/app/layout.tsx — Root layout

import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import RootHeader from "@/components/RootHeader";
import RootFooter from "@/components/RootFooter";
import { Toaster } from "sonner";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Quản lý Khách sạn",
  description: "Hệ thống quản lý khách sạn trực tuyến",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={`${beVietnamPro.className} min-h-screen`}>
        <AuthProvider>
          <div className="relative flex min-h-screen flex-col">
            <RootHeader />

            {/* Main content */}
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-4 sm:px-5 sm:pt-5 md:px-6 md:pt-6 lg:pb-8 lg:pt-8">
              {children}
            </main>

            <RootFooter />
          </div>
          <Toaster
            position="top-right"
            richColors
            closeButton
            expand
            visibleToasts={4}
            toastOptions={{
              duration: 4000,
              classNames: {
                toast: "rounded-xl border border-slate-200 bg-white shadow-lg",
                title: "text-sm font-semibold",
                description: "text-xs text-slate-500",
                success: "!border-emerald-200",
                error: "!border-red-200",
                warning: "!border-amber-200",
                info: "!border-blue-200",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
