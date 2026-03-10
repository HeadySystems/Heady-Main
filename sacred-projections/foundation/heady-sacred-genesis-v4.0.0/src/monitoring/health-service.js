'use strict';

const { CoherenceTracker } = require('../../shared/sacred-geometry');
const { CSL_THRESHOLDS } = require('../../shared/phi-math');

class HealthService {
  constructor(dependencies = {}) {
    this.dependencies = dependencies;
    this.coherenceTracker = new CoherenceTracker();
    this.coherenceTracker.record(CSL_THRESHOLDS.LOW);
  }

  snapshot() {
    return {
      status: 'healthy',
      coherence: {
        current: this.coherenceTracker.current(),
        average: this.coherenceTracker.average(),
        level: this.coherenceTracker.level()
      },
      dependencies: Object.fromEntries(
        Object.entries(this.dependencies).map(([key, dependency]) => [key, Boolean(dependency)])
      )
    };
  }
}

module.exports = { HealthService };
