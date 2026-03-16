// ============================================================
// api/index.ts — Vercel Serverless Function entry point
//
// Vercel chạy file này như một serverless function.
// Toàn bộ request đến /api/* được chuyển vào Express app.
// ============================================================

import "dotenv/config";
import app from "../src/app";

export default app;
