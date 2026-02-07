// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: backend/src/routes/api.js
// LAYER: routing
// HEADY_BRAND:END

import express from "express";
const router = express.Router();

import chatRoutes from "./chatRoutes.js";
import plannerRoutes from "./plannerRoutes.js";

// Mount sub-routers
router.use("/chat", chatRoutes);
router.use("/plan", plannerRoutes);

// Health check for API layer
router.get("/status", (req, res) => {
  res.json({ status: "active", layer: "api-v1" });
});

export default router;
