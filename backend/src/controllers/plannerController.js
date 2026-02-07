// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: backend/src/controllers/plannerController.js
// LAYER: orchestration
// HEADY_BRAND:END

import plannerService from "../services/plannerService.js";

export const generatePlan = async (req, res, next) => {
  try {
    const { tasks } = req.body;
    
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: "Tasks must be an array" });
    }

    const plan = await plannerService.generatePlan(tasks);

    res.json({
      ok: true,
      data: plan
    });
  } catch (error) {
    next(error);
  }
};
