import nodemailer from "nodemailer";

import fs from "fs/promises";
import path from "path";
import os from "os";
import puppeteer from "puppeteer";

import { xuatHoaDonHtml } from "./invoiceService";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

// Chú ý: Port 465 => secure: true, Port 587 => secure: false
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465, // true nếu 465, false nếu 587
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  // Nếu dùng port 587 và test local có thể cần:
  // tls: { rejectUnauthorized: false },
});

async function loadTemplate(templateName: string, data: Record<string, any>) {
  const templatePath = path.join(
    __dirname,
    "emailTemplates",
    `${templateName}.html`,
  );
  let html = await fs.readFile(templatePath, "utf8");
  Object.entries(data).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, "g"), String(value));
  });
  return html;
}

export class EmailService {
  static async sendBookingConfirmation(to: string, data: any) {
    try {
      console.log(
        `[EmailService] Bắt đầu gửi email xác nhận đặt phòng tới: ${to}`,
      );
      const html = await loadTemplate("bookingConfirmation", data);
      const info = await transporter.sendMail({
        from: SMTP_USER,
        to,
        subject: "Xác nhận đặt phòng khách sạn",
        html,
      });
      console.log(
        `[EmailService] Gửi email xác nhận đặt phòng thành công tới: ${to}. MessageId: ${info.messageId}`,
      );
    } catch (err) {
      if (err instanceof Error) {
        console.error("Lỗi gửi mail xác nhận đặt phòng:", {
          message: err.message,
          stack: err.stack,
          name: err.name,
        });
      } else {
        console.error("Lỗi gửi mail xác nhận đặt phòng (unknown):", err);
      }
    }
  }

  static async sendCheckoutInvoice(
    to: string,
    maHoaDon: string,
    summary: string,
  ) {
    let browser = null;
    try {
      const result = await xuatHoaDonHtml(maHoaDon);
      // Render HTML hóa đơn thành PDF bằng puppeteer
      browser = await puppeteer.launch({ args: ["--no-sandbox"] });
      const page = await browser.newPage();
      await page.setContent(result.content, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

      const html = await loadTemplate("checkoutInvoice", { summary });
      await transporter.sendMail({
        from: SMTP_USER,
        to,
        subject: "Hóa đơn thanh toán khách sạn",
        html,
        attachments: [
          {
            filename: result.fileName.replace(/\.html?$/, ".pdf"),
            content: Buffer.from(pdfBuffer),
            contentType: "application/pdf",
          },
        ],
      });
      console.log(`[EmailService] Đã gửi hóa đơn PDF thành công cho ${to}`);
    } catch (err) {
      if (err instanceof Error) {
        console.error("Lỗi gửi mail hóa đơn:", {
          message: err.message,
          name: err.name,
        });
      } else {
        console.error("Lỗi gửi mail hóa đơn (unknown):", err);
      }
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeErr) {
          console.error("Không thể đóng browser Puppeteer:", closeErr);
        }
      }
    }
  }
}
