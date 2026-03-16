// src/server.ts — Entry point cho môi trường local (không dùng trên Vercel)

import app from "./app";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

app.listen(PORT, () => {
  console.log(`[Server] Đang chạy tại http://localhost:${PORT}`);
  console.log(`[Server] Môi trường: ${process.env.NODE_ENV ?? "development"}`);
});
