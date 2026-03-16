// src/routes/checkinRoutes.ts

import { Router } from "express";
import { param } from "express-validator";
import { checkIn } from "../controllers/checkinController";

const router = Router();

// PATCH /api/check-in/:maDatPhong — Nhận phòng (Check-in)
router.patch(
  "/:maDatPhong",
  [
    param("maDatPhong")
      .notEmpty()
      .withMessage("maDatPhong là bắt buộc.")
      .isString(),
  ],
  checkIn,
);

export default router;
