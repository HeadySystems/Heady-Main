'use strict';

const { AUTO_SUCCESS, fib } = require('../../shared/phi-math');

class AutoSuccessEngine {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.categories = options.categories || [
      'CodeQuality', 'Security', 'Performance', 'Availability', 'Compliance',
      'Learning', 'Communication', 'Infrastructure', 'Intelligence', 'Governance',
      'Research', 'Maintenance', 'Projection'
    ].slice(0, AUTO_SUCCESS.CATEGORY_COUNT);
    this.tickCount = 0;
    this.taskHistory = [];
  }

  nextCycle() {
    if (!this.enabled) {
      return { enabled: false };
    }
    this.tickCount += 1;
    const tasksPerCategory = Math.max(1, Math.floor(AUTO_SUCCESS.TASK_TARGET / this.categories.length));
    const scheduled = this.categories.map((category) => ({
      category,
      taskBudget: tasksPerCategory,
      timeoutMs: AUTO_SUCCESS.TASK_TIMEOUT_MS
    }));
    this.taskHistory.push({ at: new Date().toISOString(), scheduled });
    if (this.taskHistory.length > fib(8)) {
      this.taskHistory.shift();
    }
    return {
      cycleMs: AUTO_SUCCESS.CYCLE_MS,
      tickCount: this.tickCount,
      scheduled
    };
  }
}

module.exports = { AutoSuccessEngine };
