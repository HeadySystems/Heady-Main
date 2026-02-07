// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: backend/src/controllers/chatController.js
// LAYER: orchestration
// HEADY_BRAND:END

import chatService from "../services/chatService.js";

export const handleChat = async (req, res, next) => {
  try {
    const { message, context } = req.body;
    const userId = req.user ? req.user.id : "anonymous"; // Auth middleware would populate this

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await chatService.processMessage({ 
      userId, 
      message, 
      context: context || {} 
    });

    res.json({
      ok: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
};
