// src/routes/statsRoutes.ts

import { Router } from "express";
import { getDashboard } from "../controllers/statsController";

const router = Router();

// GET /api/thong-ke/tong-quan — dashboard KPIs
router.get("/tong-quan", getDashboard);

export default router;
