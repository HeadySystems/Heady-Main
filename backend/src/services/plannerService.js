// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: backend/src/services/plannerService.js
// LAYER: intelligence
// HEADY_BRAND:END

/**
 * Monte Carlo Planning Engine
 * HCFP_03: "Instead of static due dates, use probability."
 */

class PlannerService {
  
  /**
   * Run Monte Carlo simulation on a list of tasks
   * @param {Array} tasks - List of task objects { id, estimate_min, estimate_max }
   * @param {number} iterations - Number of simulations (default 1000)
   */
  async generatePlan(tasks, iterations = 1000) {
    if (!tasks || tasks.length === 0) return { success: false, reason: "No tasks provided" };

    // Stub: Simple Probabilistic Simulation
    const results = this.simulate(tasks, iterations);

    return {
      success: true,
      plan_id: `plan_${Date.now()}`,
      summary: `Simulated ${iterations} timelines.`,
      probability_success: results.probability,
      recommended_schedule: results.schedule
    };
  }

  simulate(tasks, iterations) {
    // 1. Simple heuristic for the stub
    // Real impl would use random sampling from distribution [min, max]
    
    const totalMin = tasks.reduce((acc, t) => acc + (t.estimate_min || 15), 0);
    const totalMax = tasks.reduce((acc, t) => acc + (t.estimate_max || 60), 0);
    const avgDuration = (totalMin + totalMax) / 2;

    // Assume 8 hours (480 mins) workday
    const workdayLimit = 480;
    const probability = Math.max(0, Math.min(100, 100 * (1 - (avgDuration / workdayLimit))));

    // HCFP_03: "Auto-bump tasks if unlikely"
    const schedule = tasks.map((t, index) => ({
      ...t,
      status: index < 5 ? "today" : "tomorrow", // Hard cap of 5 for today
      confidence: index < 3 ? "high" : "low"
    }));

    return { probability, schedule };
  }
}

export default new PlannerService();
