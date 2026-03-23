/* ═══════════════════════════════════════════════════════════════
   LIVE PERFORMANCE ENGINE — Ableton Live Performance Training
   ∞ Heady × Ableton Live 12 :: Sacred Geometry Music ∞
   ═══════════════════════════════════════════════════════════════

   Trains Heady to perform music live through Ableton.
   Manages setlists, scene flows, transitions, practice modes,
   energy tracking, and automated performance decisions.

   Usage:
     const LivePerformance = require('./live-performance');
     const live = new LivePerformance(abletonBridge, midiOut);
     await live.loadSetlist(setlist);
     await live.performNext();
   ═══════════════════════════════════════════════════════════════ */

const { EventEmitter } = require('events');

const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];

// ═══════════════════════════════════════════════════════════════
// §1 — ENERGY CURVE PROFILES (Sacred Geometry)
// ═══════════════════════════════════════════════════════════════

const ENERGY_PROFILES = {
  // φ-wave: builds according to golden ratio
  golden_wave: (position, total) => {
    const x = position / total;
    return Math.min(1, Math.abs(Math.sin(x * Math.PI * PHI)) * PHI_INV + x * 0.5);
  },

  // Festival: slow build → massive peak at 61.8% → sustained energy
  festival: (position, total) => {
    const x = position / total;
    if (x < PHI_INV) return 0.3 + (x / PHI_INV) * 0.7; // build to peak
    return 0.85 + 0.15 * Math.sin((x - PHI_INV) * Math.PI * 3); // sustained high
  },

  // Journey: story arc — intro → tension → climax → resolution
  journey: (position, total) => {
    const x = position / total;
    if (x < 0.15) return 0.2 + x * 2;           // intro warmup
    if (x < 0.382) return 0.5 + (x - 0.15) * 2.15;  // build tension
    if (x < 0.618) return 1.0;                   // climax plateau
    if (x < 0.85) return 1.0 - (x - 0.618) * 1.3; // comedown
    return 0.3 + (1 - x) * 2;                    // resolution
  },

  // Fibonacci peaks: energy surges at Fibonacci-number positions
  fibonacci_peaks: (position, total) => {
    const fibPositions = FIB.filter(f => f < total);
    const nearest = fibPositions.reduce((best, f) =>
      Math.abs(f - position) < Math.abs(best - position) ? f : best, 0);
    const distance = Math.abs(position - nearest) / total;
    return 0.3 + 0.7 * Math.exp(-distance * 8);
  },

  // Flat: consistent energy (ambient / lounge sets)
  ambient: () => 0.5,
};

// ═══════════════════════════════════════════════════════════════
// §2 — TRANSITION TYPES
// ═══════════════════════════════════════════════════════════════

const TRANSITIONS = {
  // Hard cut — instant scene change
  cut: {
    bars: 0,
    description: 'Instant cut to next scene',
    execute: async (bridge, from, to) => {
      await bridge.fireScene(to.scene);
    },
  },

  // Crossfade — blend over N bars
  crossfade: {
    bars: 8,
    description: '8-bar crossfade between scenes',
    execute: async (bridge, from, to) => {
      // Fade out current tracks, fire new scene
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        const progress = i / steps;
        // Sweep master volume down, fire scene at golden point, sweep up
        if (progress >= PHI_INV) {
          await bridge.fireScene(to.scene);
          break;
        }
        await bridge.setTrackVolume(0, Math.round(127 * (1 - progress)));
        await _wait(500);
      }
      await bridge.setTrackVolume(0, 127); // restore
    },
  },

  // φ-blend — golden ratio timed transition
  phi_blend: {
    bars: 13,
    description: '13-bar golden ratio blend (5 bars fade + 8 bars blend)',
    execute: async (bridge, from, to) => {
      // FIB[5]=5 bars fade out, FIB[6]=8 bars blend in
      await _wait(5 * (60000 / (from.bpm || 120)) * 4); // 5 bars
      await bridge.fireScene(to.scene);
      await _wait(8 * (60000 / (to.bpm || 120)) * 4); // 8 bars settle
    },
  },

  // Build-drop — tension build then hard drop
  build_drop: {
    bars: 16,
    description: '16-bar build with filter sweep → hard drop',
    execute: async (bridge, from, to) => {
      // Gradual filter close (if supported)
      await bridge.sendCommand('filter_sweep', { direction: 'close', bars: 16 });
      await _wait(16 * (60000 / (from.bpm || 120)) * 4);
      // Drop!
      await bridge.fireScene(to.scene);
      await bridge.sendCommand('filter_sweep', { direction: 'open', bars: 0 });
    },
  },

  // Breakdown — strip to drums, then bring elements back
  breakdown: {
    bars: 32,
    description: '32-bar breakdown — strip down, rebuild',
    execute: async (bridge, from, to) => {
      // Mute all but drums (track 0)
      for (let t = 1; t <= 8; t++) {
        await bridge.setTrackMute(t, true);
        await _wait(2 * (60000 / (from.bpm || 120)) * 4); // 2 bars between mutes
      }
      // Fire new scene
      await bridge.fireScene(to.scene);
      // Unmute one by one (Fibonacci spacing)
      const unmuteFibs = [1, 1, 2, 3, 5, 8, 5, 3];
      for (let t = 1; t <= 8; t++) {
        const waitBars = unmuteFibs[(t - 1) % unmuteFibs.length];
        await _wait(waitBars * (60000 / (to.bpm || 120)) * 4);
        await bridge.setTrackMute(t, false);
      }
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// §3 — SETLIST ITEM SCHEMA
// ═══════════════════════════════════════════════════════════════

/*
  SetlistItem = {
    id:          string,
    name:        string,          // "Deep Space Intro"
    scene:       number,          // Ableton scene index
    bpm:         number,          // Target tempo
    key:         string,          // Musical key (e.g., "Am")
    energy:      number,          // Target energy level 0–1
    duration:    number,          // Duration in bars (or 0 for manual advance)
    transition:  string,          // Transition type to NEXT section
    tags:        string[],        // ['ambient', 'build', 'peak', 'breakdown']
    notes:       string,          // Performance notes
    patterns:    object[],        // Sacred Geometry patterns to trigger
    tracks: {
      [trackIndex]: {
        volume: number,            // 0–127
        muted: boolean,
        solo: boolean,
      }
    },
  }
*/

// ═══════════════════════════════════════════════════════════════
// §4 — LIVE PERFORMANCE ENGINE
// ═══════════════════════════════════════════════════════════════

class LivePerformance extends EventEmitter {
  constructor(abletonBridge, midiOut, options = {}) {
    super();

    this.bridge = abletonBridge;
    this.midi = midiOut;

    // Setlist state
    this.setlist = [];
    this.currentIndex = -1;
    this.isPerforming = false;
    this.isPaused = false;

    // Energy tracking
    this.energyProfile = ENERGY_PROFILES[options.energyProfile || 'journey'];
    this.currentEnergy = 0;
    this.targetEnergy = 0;
    this.energyHistory = [];

    // Timing
    this.setStartTime = null;
    this.sectionStartTime = null;
    this.totalBars = 0;

    // Practice mode
    this.practiceMode = options.practiceMode || false;
    this.practiceSpeed = options.practiceSpeed || 1.0; // 0.5 = half speed

    // Performance metrics
    this.metrics = {
      transitionsTimed: 0,
      transitionsMissed: 0,
      avgTransitionAccuracy: 0,
      sectionsPlayed: 0,
      totalPerformanceTime: 0,
      energyCurveFollowed: 0,
    };

    // Auto-advance timer
    this._advanceTimer = null;
  }

  // ── Setlist Management ──────────────────────────────────────

  /**
   * Load a setlist
   * @param {Array<SetlistItem>} items — Ordered list of sections
   */
  loadSetlist(items) {
    this.setlist = items.map((item, i) => ({
      id: item.id || `section_${i}`,
      scene: item.scene ?? i,
      bpm: item.bpm || 120,
      key: item.key || 'C',
      energy: item.energy ?? this.energyProfile(i, items.length),
      duration: item.duration || 0, // 0 = manual advance
      transition: item.transition || 'crossfade',
      tags: item.tags || [],
      notes: item.notes || '',
      patterns: item.patterns || [],
      tracks: item.tracks || {},
      ...item,
    }));

    this.currentIndex = -1;
    this.totalBars = this.setlist.reduce((sum, s) => sum + (s.duration || 32), 0);

    this.emit('setlist_loaded', {
      sections: this.setlist.length,
      totalBars: this.totalBars,
      estimatedMinutes: Math.round(this.totalBars * (60 / 120) / 4), // rough at 120bpm
    });

    return this;
  }

  /**
   * Create a setlist from common templates
   */
  static createSetlist(template, options = {}) {
    const bpm = options.bpm || 122;
    const key = options.key || 'Am';

    const TEMPLATES = {
      // 1-hour DJ set: Fibonacci-structured sections
      dj_set: [
        { name: 'Intro',     bpm, key, energy: 0.2, duration: 32,  transition: 'crossfade', tags: ['ambient'] },
        { name: 'Warm Up',   bpm, key, energy: 0.4, duration: 64,  transition: 'crossfade', tags: ['groove'] },
        { name: 'Build 1',   bpm: bpm + 3, key, energy: 0.6, duration: 32,  transition: 'phi_blend', tags: ['build'] },
        { name: 'Peak 1',    bpm: bpm + 5, key, energy: 0.85, duration: 64, transition: 'breakdown', tags: ['peak'] },
        { name: 'Breakdown', bpm: bpm - 2, key, energy: 0.4, duration: 32,  transition: 'build_drop', tags: ['breakdown'] },
        { name: 'Build 2',   bpm: bpm + 5, key, energy: 0.75, duration: 32, transition: 'phi_blend', tags: ['build'] },
        { name: 'Main Peak', bpm: bpm + 8, key, energy: 1.0, duration: 64,  transition: 'breakdown', tags: ['peak', 'climax'] },
        { name: 'Vibe Down', bpm: bpm + 2, key, energy: 0.65, duration: 32, transition: 'crossfade', tags: ['groove'] },
        { name: 'Last Push', bpm: bpm + 5, key, energy: 0.9, duration: 32,  transition: 'build_drop', tags: ['peak'] },
        { name: 'Cool Down', bpm: bpm - 5, key, energy: 0.35, duration: 32, transition: 'crossfade', tags: ['ambient'] },
        { name: 'Outro',     bpm: bpm - 8, key, energy: 0.15, duration: 32, transition: 'cut', tags: ['ambient'] },
      ],

      // Live jam session: looser structure
      jam_session: [
        { name: 'Soundcheck Groove', bpm, key, energy: 0.3, duration: 0, transition: 'crossfade', tags: ['ambient'] },
        { name: 'Opening Theme',     bpm, key, energy: 0.5, duration: 0, transition: 'phi_blend', tags: ['groove'] },
        { name: 'Exploration',       bpm: bpm + 5, key, energy: 0.7, duration: 0, transition: 'crossfade', tags: ['build'] },
        { name: 'Peak Improvisation', bpm: bpm + 10, key, energy: 1.0, duration: 0, transition: 'breakdown', tags: ['peak'] },
        { name: 'Ambient Interlude', bpm: bpm - 10, key, energy: 0.3, duration: 0, transition: 'phi_blend', tags: ['ambient'] },
        { name: 'Return',            bpm, key, energy: 0.8, duration: 0, transition: 'build_drop', tags: ['peak'] },
        { name: 'Closing Theme',     bpm: bpm - 5, key, energy: 0.4, duration: 0, transition: 'crossfade', tags: ['groove'] },
        { name: 'Fade Out',          bpm: bpm - 10, key, energy: 0.1, duration: 32, transition: 'cut', tags: ['ambient'] },
      ],

      // Practice routine: structured drills
      practice: [
        { name: 'Warm Up — Scales',        bpm: 80, key, energy: 0.3, duration: 16, transition: 'cut', tags: ['practice'] },
        { name: 'Chord Voicings',           bpm: 90, key, energy: 0.4, duration: 16, transition: 'cut', tags: ['practice'] },
        { name: 'Rhythm — Fibonacci Beats', bpm: 100, key, energy: 0.5, duration: 32, transition: 'cut', tags: ['practice'] },
        { name: 'Transitions — Slow',       bpm: 100, key, energy: 0.5, duration: 16, transition: 'crossfade', tags: ['practice'] },
        { name: 'Transitions — Fast',       bpm: 120, key, energy: 0.6, duration: 16, transition: 'phi_blend', tags: ['practice'] },
        { name: 'Improv — Free',            bpm: 110, key, energy: 0.7, duration: 0,  transition: 'cut', tags: ['practice'] },
        { name: 'Build & Drop Drill',       bpm: 128, key, energy: 0.9, duration: 32, transition: 'build_drop', tags: ['practice'] },
        { name: 'Cool Down',               bpm: 85, key, energy: 0.2, duration: 16, transition: 'cut', tags: ['practice'] },
      ],
    };

    return TEMPLATES[template] || TEMPLATES.dj_set;
  }

  // ── Performance Controls ────────────────────────────────────

  /**
   * Start the performance (begin from section 0)
   */
  async startPerformance() {
    if (this.setlist.length === 0) throw new Error('No setlist loaded');

    this.isPerforming = true;
    this.isPaused = false;
    this.setStartTime = Date.now();
    this.currentIndex = -1;
    this.metrics.sectionsPlayed = 0;

    console.log('');
    console.log('  ∞ ═══════════════════════════════════════════ ∞');
    console.log('  ║      HEADY LIVE PERFORMANCE — ACTIVE       ║');
    console.log(`  ║  Setlist: ${this.setlist.length} sections | ${this.practiceMode ? 'PRACTICE' : 'LIVE'} MODE   ║`);
    console.log('  ∞ ═══════════════════════════════════════════ ∞');
    console.log('');

    this.emit('performance_started', {
      sections: this.setlist.length,
      mode: this.practiceMode ? 'practice' : 'live',
    });

    return this.performNext();
  }

  /**
   * Advance to the next section
   */
  async performNext() {
    if (!this.isPerforming) return;
    if (this.currentIndex >= this.setlist.length - 1) {
      return this.endPerformance();
    }

    const prevIndex = this.currentIndex;
    this.currentIndex++;
    const section = this.setlist[this.currentIndex];
    const prev = prevIndex >= 0 ? this.setlist[prevIndex] : null;

    console.log(`[Live] → Section ${this.currentIndex + 1}/${this.setlist.length}: "${section.name}"`);
    console.log(`[Live]   BPM: ${section.bpm} | Key: ${section.key} | Energy: ${(section.energy * 100).toFixed(0)}%`);

    // Execute transition from previous section
    if (prev && prev.transition && TRANSITIONS[prev.transition]) {
      const trans = TRANSITIONS[prev.transition];
      console.log(`[Live]   Transition: ${trans.description}`);

      const transStart = Date.now();
      try {
        await trans.execute(this.bridge, prev, section);
        this.metrics.transitionsTimed++;
      } catch (e) {
        console.log(`[Live]   ⚠ Transition error: ${e.message}`);
        this.metrics.transitionsMissed++;
        // Fallback: hard cut
        try { await this.bridge.fireScene(section.scene); } catch { /* ok */ }
      }
      const transTime = Date.now() - transStart;
      console.log(`[Live]   Transition completed in ${transTime}ms`);
    } else {
      // First section or no transition — just fire scene
      try { await this.bridge.fireScene(section.scene); } catch { /* ok */ }
    }

    // Set tempo
    try { await this.bridge.setTempo(section.bpm); } catch { /* ok */ }

    // Apply track settings
    if (section.tracks) {
      for (const [track, settings] of Object.entries(section.tracks)) {
        const t = parseInt(track, 10);
        if (settings.volume !== undefined) {
          try { await this.bridge.setTrackVolume(t, settings.volume); } catch { /* ok */ }
        }
        if (settings.muted !== undefined) {
          try { await this.bridge.setTrackMute(t, settings.muted); } catch { /* ok */ }
        }
      }
    }

    // Update energy tracking
    this.currentEnergy = section.energy;
    this.targetEnergy = section.energy;
    this.energyHistory.push({
      timestamp: Date.now(),
      section: section.name,
      energy: section.energy,
    });

    this.sectionStartTime = Date.now();
    this.metrics.sectionsPlayed++;

    this.emit('section_started', {
      index: this.currentIndex,
      name: section.name,
      bpm: section.bpm,
      key: section.key,
      energy: section.energy,
      transition: section.transition,
      remaining: this.setlist.length - this.currentIndex - 1,
    });

    // Auto-advance if duration is set
    if (section.duration > 0) {
      const durationMs = section.duration * (60000 / section.bpm) * 4; // bars → ms
      const adjustedMs = this.practiceMode ? durationMs / this.practiceSpeed : durationMs;

      this._advanceTimer = setTimeout(() => {
        this.performNext();
      }, adjustedMs);

      console.log(`[Live]   Auto-advance in ${Math.round(adjustedMs / 1000)}s (${section.duration} bars)`);
    } else {
      console.log('[Live]   Manual advance — call performNext() when ready');
    }

    return section;
  }

  /**
   * Jump to a specific section by index or name
   */
  async jumpTo(target) {
    let index;
    if (typeof target === 'number') {
      index = target;
    } else {
      index = this.setlist.findIndex(s =>
        s.name.toLowerCase().includes(target.toLowerCase()) ||
        s.id === target
      );
    }

    if (index < 0 || index >= this.setlist.length) {
      throw new Error(`Section not found: ${target}`);
    }

    if (this._advanceTimer) clearTimeout(this._advanceTimer);
    this.currentIndex = index - 1; // performNext will increment
    return this.performNext();
  }

  /** Pause the performance */
  pause() {
    this.isPaused = true;
    if (this._advanceTimer) clearTimeout(this._advanceTimer);
    this.emit('performance_paused');
    console.log('[Live] ⏸ Performance paused');
  }

  /** Resume the performance */
  resume() {
    this.isPaused = false;
    this.emit('performance_resumed');
    console.log('[Live] ▶ Performance resumed');
  }

  /** End the performance */
  endPerformance() {
    this.isPerforming = false;
    if (this._advanceTimer) clearTimeout(this._advanceTimer);

    this.metrics.totalPerformanceTime = Date.now() - this.setStartTime;

    const summary = {
      totalTime: `${Math.round(this.metrics.totalPerformanceTime / 60000)} min`,
      sectionsPlayed: this.metrics.sectionsPlayed,
      transitionsGood: this.metrics.transitionsTimed,
      transitionsMissed: this.metrics.transitionsMissed,
      accuracy: this.metrics.transitionsTimed + this.metrics.transitionsMissed > 0
        ? `${Math.round(this.metrics.transitionsTimed / (this.metrics.transitionsTimed + this.metrics.transitionsMissed) * 100)}%`
        : 'N/A',
    };

    console.log('');
    console.log('  ∞ ═══════════════════════════════════════════ ∞');
    console.log('  ║     PERFORMANCE COMPLETE — STATS BELOW     ║');
    console.log('  ∞ ═══════════════════════════════════════════ ∞');
    console.log(`  Total Time:   ${summary.totalTime}`);
    console.log(`  Sections:     ${summary.sectionsPlayed}`);
    console.log(`  Transitions:  ${summary.transitionsGood} clean / ${summary.transitionsMissed} missed`);
    console.log(`  Accuracy:     ${summary.accuracy}`);
    console.log('');

    this.emit('performance_ended', summary);
    return summary;
  }

  // ── Energy Control ──────────────────────────────────────────

  /**
   * Adjust energy level (e.g., reading crowd)
   * @param {number} delta — Energy change (-1 to 1)
   */
  adjustEnergy(delta) {
    this.currentEnergy = Math.max(0, Math.min(1, this.currentEnergy + delta));
    this.emit('energy_changed', { energy: this.currentEnergy, delta });
    console.log(`[Live] Energy: ${(this.currentEnergy * 100).toFixed(0)}% (${delta > 0 ? '+' : ''}${(delta * 100).toFixed(0)}%)`);
    return this.currentEnergy;
  }

  /** Get suggested energy based on profile and position */
  getSuggestedEnergy() {
    if (this.currentIndex < 0) return 0;
    return this.energyProfile(this.currentIndex, this.setlist.length);
  }

  // ── Status ──────────────────────────────────────────────────

  getStatus() {
    const current = this.currentIndex >= 0 ? this.setlist[this.currentIndex] : null;
    const next = this.currentIndex + 1 < this.setlist.length ? this.setlist[this.currentIndex + 1] : null;

    return {
      performing: this.isPerforming,
      paused: this.isPaused,
      practiceMode: this.practiceMode,
      currentSection: current ? {
        index: this.currentIndex,
        name: current.name,
        bpm: current.bpm,
        key: current.key,
        energy: current.energy,
        elapsed: this.sectionStartTime ? `${Math.round((Date.now() - this.sectionStartTime) / 1000)}s` : null,
      } : null,
      nextSection: next ? { name: next.name, bpm: next.bpm, transition: current?.transition } : null,
      progress: `${this.currentIndex + 1}/${this.setlist.length}`,
      energy: {
        current: this.currentEnergy,
        suggested: this.getSuggestedEnergy(),
      },
      totalElapsed: this.setStartTime ? `${Math.round((Date.now() - this.setStartTime) / 60000)} min` : null,
      metrics: this.metrics,
    };
  }

  /** Get full setlist with energy curve */
  getSetlistView() {
    return this.setlist.map((s, i) => ({
      index: i,
      name: s.name,
      bpm: s.bpm,
      key: s.key,
      energy: `${(s.energy * 100).toFixed(0)}%`,
      duration: s.duration ? `${s.duration} bars` : 'manual',
      transition: s.transition,
      tags: s.tags,
      isCurrent: i === this.currentIndex,
      isPlayed: i < this.currentIndex,
    }));
  }
}

// ═══════════════════════════════════════════════════════════════
// §5 — UTILITY
// ═══════════════════════════════════════════════════════════════

function _wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = LivePerformance;
module.exports.ENERGY_PROFILES = ENERGY_PROFILES;
module.exports.TRANSITIONS = TRANSITIONS;
