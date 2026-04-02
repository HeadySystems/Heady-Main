/* ═══════════════════════════════════════════════════════════════
   SACRED SEQUENCER — Golden Ratio Pattern Generation
   ∞ Sacred Geometry :: Organic Systems :: Breathing Interfaces ∞
   ═══════════════════════════════════════════════════════════════

   All patterns derived from φ (1.618) and the Fibonacci sequence.
   This is the musical expression of Heady's Sacred Geometry core.
   ═══════════════════════════════════════════════════════════════ */

const PHI = 1.6180339887;
const PHI_INV = 0.6180339887; // 1/φ

// ── Musical Constants ────────────────────────────────────────
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SCALES = {
  major:      [0, 2, 4, 5, 7, 9, 11],
  minor:      [0, 2, 3, 5, 7, 8, 10],
  dorian:     [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues:      [0, 3, 5, 6, 7, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  // Sacred Geometry scale — intervals derived from golden ratio
  sacred:     [0, 2, 3, 5, 8, 9, 11], // Fibonacci-adjacent intervals
};

const CHORD_TYPES = {
  major:  [0, 4, 7],
  minor:  [0, 3, 7],
  dim:    [0, 3, 6],
  aug:    [0, 4, 8],
  maj7:   [0, 4, 7, 11],
  min7:   [0, 3, 7, 10],
  dom7:   [0, 4, 7, 10],
  sus2:   [0, 2, 7],
  sus4:   [0, 5, 7],
};

class SacredSequencer {

  /* ══════════════════════════════════════════════════════════
     FIBONACCI RHYTHMS
     Beat patterns based on the Fibonacci sequence
     ══════════════════════════════════════════════════════════ */

  /**
   * Generate a Fibonacci rhythm pattern
   * @param {number} steps - Number of steps in the pattern (default 16)
   * @param {number} depth - How many Fibonacci numbers to use (default 5)
   * @returns {Array<{step, hit, velocity, duration}>}
   */
  static fibonacciRhythm(steps = 16, depth = 5) {
    const fib = SacredSequencer._fibonacci(depth + 2);
    const pattern = [];

    // Place hits at Fibonacci-number positions (mod steps)
    const hitPositions = new Set(fib.map(f => f % steps));

    for (let i = 0; i < steps; i++) {
      const isHit = hitPositions.has(i);
      pattern.push({
        step: i,
        hit: isHit,
        velocity: isHit ? Math.round(80 + Math.random() * 40) : 0,
        duration: isHit ? Math.round(100 + (i % 3) * 50) : 0,
      });
    }

    return pattern;
  }

  /**
   * Generate a Euclidean rhythm (Bjorklund algorithm)
   * with Fibonacci-derived pulse counts
   * @param {number} steps - Total steps
   * @param {number} [pulses] - Number of hits (default: nearest Fibonacci to steps × φ_inv)
   */
  static euclideanFibRhythm(steps = 16, pulses) {
    if (!pulses) {
      // Use golden ratio to determine pulse count
      pulses = Math.round(steps * PHI_INV);
    }
    pulses = Math.min(pulses, steps);

    const pattern = SacredSequencer._bjorklund(steps, pulses);
    return pattern.map((hit, i) => ({
      step: i,
      hit: !!hit,
      velocity: hit ? Math.round(90 + Math.random() * 30) : 0,
      duration: hit ? 200 : 0,
    }));
  }

  /* ══════════════════════════════════════════════════════════
     GOLDEN RATIO MELODIES
     Note selections and intervals derived from φ
     ══════════════════════════════════════════════════════════ */

  /**
   * Generate a melody using golden ratio intervals
   * @param {string} key - Root note (e.g., 'C', 'A', 'F#')
   * @param {string} scaleName - Scale name (e.g., 'minor', 'sacred')
   * @param {number} length - Number of notes
   * @param {number} octave - Starting octave (default 4)
   * @returns {Array<{note, midiNote, velocity, duration}>}
   */
  static goldenMelody(key = 'C', scaleName = 'minor', length = 16, octave = 4) {
    const rootMidi = SacredSequencer._noteToMidi(key, octave);
    const scale = SCALES[scaleName] || SCALES.minor;
    const melody = [];

    const scaleLen = scale.length;

    for (let i = 0; i < length; i++) {
      // Use golden ratio to determine next interval
      const goldenStep = Math.round(i * PHI) % scaleLen;
      const scaleOffset = scale[goldenStep];

      // Determine octave shift based on Fibonacci thresholds
      const octaveShift = Math.floor(i * PHI_INV / scaleLen);
      const midiNote = rootMidi + scaleOffset + (octaveShift * 12);

      // Velocity follows a sine wave modulated by phi
      const velocity = Math.round(70 + 30 * Math.sin(i * PHI));

      // Duration follows golden ratio proportions
      const baseDuration = 250;
      const durationMultiplier = (i % 3 === 0) ? PHI : (i % 3 === 1) ? 1 : PHI_INV;
      const duration = Math.round(baseDuration * durationMultiplier);

      melody.push({
        note: NOTE_NAMES[midiNote % 12] + Math.floor(midiNote / 12) - 1,
        midiNote: Math.max(0, Math.min(127, midiNote)),
        velocity: Math.max(40, Math.min(127, velocity)),
        duration,
      });
    }

    return melody;
  }

  /**
   * Generate a scale-walk melody that spirals through octaves
   * using golden ratio step sizes
   */
  static spiralMelody(key = 'C', scaleName = 'sacred', length = 32, octave = 3) {
    const rootMidi = SacredSequencer._noteToMidi(key, octave);
    const scale = SCALES[scaleName] || SCALES.sacred;
    const melody = [];

    for (let i = 0; i < length; i++) {
      // Spiral position: golden angle in the scale
      const angle = i * PHI * 2 * Math.PI / scale.length;
      const scaleIndex = Math.floor(Math.abs(Math.sin(angle)) * scale.length) % scale.length;
      const octaveOffset = Math.floor(i * PHI_INV / 4) * 12;

      const midiNote = rootMidi + scale[scaleIndex] + octaveOffset;

      melody.push({
        note: NOTE_NAMES[midiNote % 12] + Math.floor(midiNote / 12) - 1,
        midiNote: Math.max(24, Math.min(108, midiNote)),
        velocity: Math.round(60 + 40 * Math.abs(Math.cos(angle))),
        duration: Math.round(200 * (1 + 0.5 * Math.sin(i * PHI_INV))),
      });
    }

    return melody;
  }

  /* ══════════════════════════════════════════════════════════
     CHORD PROGRESSIONS
     Harmonically rich progressions using sacred intervals
     ══════════════════════════════════════════════════════════ */

  /**
   * Generate a chord progression
   * @param {string} key - Root note
   * @param {string} scaleName - Scale type
   * @param {number} chords - Number of chords (default 4)
   * @param {number} octave - Bass octave (default 3)
   */
  static chordProgression(key = 'C', scaleName = 'minor', chords = 4, octave = 3) {
    const rootMidi = SacredSequencer._noteToMidi(key, octave);
    const scale = SCALES[scaleName] || SCALES.minor;
    const progression = [];

    // Common sacred progressions (scale degree patterns)
    const sacredProgressions = [
      [0, 5, 3, 4],   // i - VI - iv - v
      [0, 3, 5, 4],   // i - iv - VI - v
      [0, 2, 5, 3],   // i - III - VI - iv
      [0, 4, 3, 5],   // i - v - iv - VI
      [0, 5, 1, 4],   // i - VI - ii - v
    ];

    // Select progression based on phi-derived index
    const progIndex = Math.floor(PHI * chords) % sacredProgressions.length;
    const prog = sacredProgressions[progIndex];

    for (let i = 0; i < chords; i++) {
      const degree = prog[i % prog.length] % scale.length;
      const root = rootMidi + scale[degree];

      // Determine chord quality based on scale degree
      const isMinor = [0, 1, 3].includes(degree);
      const chordType = isMinor ? 'minor' : 'major';
      const intervals = CHORD_TYPES[chordType];

      const midiNotes = intervals.map(iv => Math.max(0, Math.min(127, root + iv)));

      progression.push({
        root: NOTE_NAMES[root % 12],
        type: chordType,
        midiNotes,
        duration: Math.round(1000 * PHI), // golden-ratio duration
        velocity: Math.round(80 + 20 * Math.sin(i * PHI)),
      });
    }

    return progression;
  }

  /* ══════════════════════════════════════════════════════════
     PHI-TIMED SEQUENCES
     Note durations in golden ratio proportions
     ══════════════════════════════════════════════════════════ */

  /**
   * Generate a pattern where note timings follow golden ratio subdivisions
   * @param {number} baseBeatMs - Base beat duration in milliseconds
   * @param {number} length - Number of events
   */
  static phiTimedSequence(baseBeatMs = 500, length = 16) {
    const sequence = [];
    // Golden ratio time divisions
    const divisions = [
      baseBeatMs,                         // 1
      baseBeatMs * PHI_INV,               // 1/φ ≈ 0.618
      baseBeatMs * PHI,                   // φ ≈ 1.618
      baseBeatMs * PHI_INV * PHI_INV,     // 1/φ² ≈ 0.382
      baseBeatMs * PHI * PHI_INV,         // 1
      baseBeatMs * 2 * PHI_INV,           // 2/φ ≈ 1.236
    ];

    for (let i = 0; i < length; i++) {
      const divIndex = Math.floor(i * PHI) % divisions.length;
      sequence.push({
        step: i,
        duration: Math.round(divisions[divIndex]),
        gap: Math.round(divisions[(divIndex + 1) % divisions.length] * 0.1),
      });
    }

    return sequence;
  }

  /* ══════════════════════════════════════════════════════════
     FULL PATTERN GENERATION
     Combines rhythm, melody, and timing
     ══════════════════════════════════════════════════════════ */

  /**
   * Generate a complete playable pattern
   * @param {object} options
   * @param {string} options.type - 'fibonacci' | 'euclidean' | 'golden' | 'spiral' | 'chord'
   * @param {string} options.key - Root note
   * @param {string} options.scale - Scale name
   * @param {number} options.length - Pattern length
   * @param {number} options.tempo - BPM for timing calculations
   * @param {number} options.octave - Starting octave
   */
  static generatePattern(options = {}) {
    const {
      type = 'golden',
      key = 'C',
      scale = 'minor',
      length = 16,
      tempo = 120,
      octave = 4,
    } = options;

    const beatMs = 60000 / tempo;

    switch (type) {
      case 'fibonacci': {
        const rhythm = SacredSequencer.fibonacciRhythm(length);
        const melody = SacredSequencer.goldenMelody(key, scale, length, octave);
        return rhythm.map((r, i) => ({
          ...r,
          ...melody[i],
          hit: r.hit,
          duration: r.hit ? melody[i].duration : 0,
          timing: i * beatMs / 4, // 16th note grid
        }));
      }

      case 'euclidean': {
        const rhythm = SacredSequencer.euclideanFibRhythm(length);
        const melody = SacredSequencer.goldenMelody(key, scale, length, octave);
        return rhythm.map((r, i) => ({
          ...r,
          ...melody[i],
          hit: r.hit,
          duration: r.hit ? melody[i].duration : 0,
          timing: i * beatMs / 4,
        }));
      }

      case 'golden':
        return SacredSequencer.goldenMelody(key, scale, length, octave).map((n, i) => ({
          ...n,
          hit: true,
          step: i,
          timing: i * beatMs / 4,
        }));

      case 'spiral':
        return SacredSequencer.spiralMelody(key, scale, length, octave).map((n, i) => ({
          ...n,
          hit: true,
          step: i,
          timing: i * beatMs / 4,
        }));

      case 'chord':
        return SacredSequencer.chordProgression(key, scale, length, octave).map((c, i) => ({
          ...c,
          hit: true,
          step: i,
          timing: i * beatMs * (options.chordsPerBar || 1),
        }));

      default:
        return SacredSequencer.goldenMelody(key, scale, length, octave);
    }
  }

  /* ══════════════════════════════════════════════════════════
     UTILITY
     ══════════════════════════════════════════════════════════ */

  static _fibonacci(n) {
    const seq = [0, 1];
    for (let i = 2; i < n; i++) {
      seq.push(seq[i - 1] + seq[i - 2]);
    }
    return seq;
  }

  static _noteToMidi(noteName, octave = 4) {
    const index = NOTE_NAMES.indexOf(noteName.toUpperCase());
    if (index === -1) return 60; // Default to middle C
    return index + (octave + 1) * 12;
  }

  static _bjorklund(steps, pulses) {
    // Euclidean rhythm algorithm
    if (pulses >= steps) return new Array(steps).fill(1);
    if (pulses === 0) return new Array(steps).fill(0);

    let pattern = [];
    let counts = [];
    let remainders = [];

    let divisor = steps - pulses;
    remainders.push(pulses);
    let level = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      counts.push(Math.floor(divisor / remainders[level]));
      remainders.push(divisor % remainders[level]);
      divisor = remainders[level];
      level++;

      if (remainders[level] <= 1) break;
    }

    counts.push(divisor);

    function build(level) {
      if (level === -1) {
        pattern.push(0);
      } else if (level === -2) {
        pattern.push(1);
      } else {
        for (let i = 0; i < counts[level]; i++) {
          build(level - 1);
        }
        if (remainders[level] !== 0) {
          build(level - 2);
        }
      }
    }

    build(level);
    // Rotate to start on a hit
    const firstHit = pattern.indexOf(1);
    if (firstHit > 0) {
      pattern = [...pattern.slice(firstHit), ...pattern.slice(0, firstHit)];
    }
    return pattern;
  }

  /**
   * Get available pattern types and their descriptions
   */
  static getPatternTypes() {
    return {
      fibonacci: 'Beat patterns with hits at Fibonacci-number positions',
      euclidean: 'Euclidean rhythms with golden-ratio pulse counts (Bjorklund algorithm)',
      golden: 'Melodic patterns with intervals derived from φ',
      spiral: 'Spiraling melodies using golden angle through scale degrees',
      chord: 'Chord progressions using sacred interval patterns',
    };
  }

  static getScales() {
    return Object.keys(SCALES);
  }

  static getNoteNames() {
    return [...NOTE_NAMES];
  }
}

module.exports = SacredSequencer;
