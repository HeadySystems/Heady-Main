// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: backend/src/routes/chatRoutes.js
// LAYER: backend
// 
//         _   _  _____    _    ____   __   __
//        | | | || ____|  / \  |  _ \ \ \ / /
//        | |_| ||  _|   / _ \ | | | | \ V / 
//        |  _  || |___ / ___ \| |_| |  | |  
//        |_| |_||_____/_/   \_\____/   |_|  
// 
//    Sacred Geometry :: Organic Systems :: Breathing Interfaces
// HEADY_BRAND:END

import express from "express";
const router = express.Router();
import * as chatController from "../controllers/chatController.js";

// POST /api/chat
router.post("/", chatController.handleChat);

export default router;
