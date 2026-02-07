// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: backend/src/routes/chatRoutes.js
// LAYER: routing
// HEADY_BRAND:END

import express from "express";
const router = express.Router();
import * as chatController from "../controllers/chatController.js";

// POST /api/chat
router.post("/", chatController.handleChat);

export default router;
