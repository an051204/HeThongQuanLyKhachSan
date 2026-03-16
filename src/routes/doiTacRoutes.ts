// src/routes/doiTacRoutes.ts

import { Router } from "express";
import { body, param } from "express-validator";
import {
  listDoiTac,
  getDoiTac,
  createDoiTac,
  updateDoiTac,
  generateApiKey,
} from "../controllers/doiTacController";

const router = Router();

// GET  /api/doi-tac
router.get("/", listDoiTac);

// GET  /api/doi-tac/:id
router.get("/:id", [param("id").notEmpty()], getDoiTac);

// POST /api/doi-tac
router.post(
  "/",
  [
    body("tenDoiTac").notEmpty().withMessage("tenDoiTac là bắt buộc.").trim(),
    body("email").isEmail().withMessage("Email không hợp lệ.").normalizeEmail(),
    body("tyLeChietKhau")
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage("Tỷ lệ chiết khấu phải từ 0 đến 100."),
  ],
  createDoiTac,
);

// PUT  /api/doi-tac/:id
router.put("/:id", [param("id").notEmpty()], updateDoiTac);

// POST /api/doi-tac/:id/api-key — tạo mới API key
router.post("/:id/api-key", [param("id").notEmpty()], generateApiKey);

export default router;
