// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: backend/src/routes/plannerRoutes.js
// LAYER: routing
// HEADY_BRAND:END

import express from "express";
const router = express.Router();
import * as plannerController from "../controllers/plannerController.js";

// POST /api/plan
router.post("/", plannerController.generatePlan);

export default router;
