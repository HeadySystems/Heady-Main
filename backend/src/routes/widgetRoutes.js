// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: backend/src/routes/widgetRoutes.js
// LAYER: routing
// HEADY_BRAND:END

/**
 * Serves the HeadyBuddy Widget static files.
 * This allows the backend to act as the CDN for the widget.
 */

import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// The widget package path - go up from src/routes to root/packages/widget
const WIDGET_PATH = path.resolve(__dirname, "../../../packages/widget");

// 1. Serve the JS Loader
router.get("/heady-buddy.js", (req, res) => {
  const filePath = path.join(WIDGET_PATH, "heady-buddy.js");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "application/javascript");
    res.sendFile(filePath);
  } else {
    res.status(404).send("Widget loader not found");
  }
});

// 2. Serve the Chat Interface (HTML)
router.get("/chat.html", (req, res) => {
  const filePath = path.join(WIDGET_PATH, "chat.html");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "text/html");
    res.sendFile(filePath);
  } else {
    res.status(404).send("Widget HTML not found");
  }
});

export default router;
