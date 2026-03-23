/* ═══════════════════════════════════════════════════════════════
   MIDI BRIDGE — Virtual MIDI Port Communication
   ∞ Heady × Ableton Live 12 ∞
   ═══════════════════════════════════════════════════════════════ */

const { EventEmitter } = require('events');

let easymidi;
try {
  easymidi = require('easymidi');
} catch (e) {
  // Graceful fallback if easymidi not available (no native MIDI drivers)
  easymidi = null;
}

class MidiBridge extends EventEmitter {
  constructor(options = {}) {
    super();
    this.outputName = options.outputName || 'Heady Out';
    this.inputName = options.inputName || 'Heady In';
    this.output = null;
    this.input = null;
    this.enabled = !!easymidi;
    this.channel = options.channel || 0;
  }

  /* ── Connection ─────────────────────────────────────────── */

  start() {
    if (!this.enabled) {
      console.log('[MidiBridge] easymidi not available — MIDI bridge disabled');
      console.log('[MidiBridge] Install native MIDI drivers and rebuild easymidi to enable');
      return false;
    }

    try {
      // Create virtual MIDI ports
      this.output = new easymidi.Output(this.outputName, true);
      console.log(`[MidiBridge] ✓ Virtual MIDI output: "${this.outputName}"`);

      this.input = new easymidi.Input(this.inputName, true);
      console.log(`[MidiBridge] ✓ Virtual MIDI input: "${this.inputName}"`);

      // Listen for incoming MIDI
      this._setupListeners();
      return true;
    } catch (err) {
      console.error('[MidiBridge] Failed to create MIDI ports:', err.message);
      this.enabled = false;
      return false;
    }
  }

  stop() {
    if (this.output) {
      this.output.close();
      this.output = null;
    }
    if (this.input) {
      this.input.close();
      this.input = null;
    }
  }

  _setupListeners() {
    if (!this.input) return;

    // Note events
    this.input.on('noteon', (msg) => {
      this.emit('noteon', {
        note: msg.note,
        velocity: msg.velocity,
        channel: msg.channel,
      });
    });

    this.input.on('noteoff', (msg) => {
      this.emit('noteoff', {
        note: msg.note,
        velocity: msg.velocity,
        channel: msg.channel,
      });
    });

    // Control Change
    this.input.on('cc', (msg) => {
      this.emit('cc', {
        controller: msg.controller,
        value: msg.value,
        channel: msg.channel,
      });
    });

    // Pitch bend
    this.input.on('pitch', (msg) => {
      this.emit('pitch', { value: msg.value, channel: msg.channel });
    });
  }

  /* ── Note Output ────────────────────────────────────────── */

  /**
   * Send a MIDI note-on
   * @param {number} note - MIDI note number (0-127)
   * @param {number} velocity - Velocity (0-127)
   * @param {number} [channel] - MIDI channel (0-15)
   */
  sendNote(note, velocity = 100, channel) {
    if (!this.output) return;
    this.output.send('noteon', {
      note: Math.max(0, Math.min(127, note)),
      velocity: Math.max(0, Math.min(127, velocity)),
      channel: channel ?? this.channel,
    });
  }

  /**
   * Send a MIDI note-off
   */
  sendNoteOff(note, channel) {
    if (!this.output) return;
    this.output.send('noteoff', {
      note: Math.max(0, Math.min(127, note)),
      velocity: 0,
      channel: channel ?? this.channel,
    });
  }

  /**
   * Play a note for a specific duration (ms)
   */
  playNote(note, velocity = 100, durationMs = 500, channel) {
    this.sendNote(note, velocity, channel);
    setTimeout(() => {
      this.sendNoteOff(note, channel);
    }, durationMs);
  }

  /**
   * Play a sequence of notes [{note, velocity, duration}, ...]
   */
  async playSequence(notes, channel) {
    for (const n of notes) {
      this.sendNote(n.note, n.velocity || 100, channel);
      await this._sleep(n.duration || 500);
      this.sendNoteOff(n.note, channel);
      if (n.gap) await this._sleep(n.gap);
    }
  }

  /* ── Control Change ─────────────────────────────────────── */

  /**
   * Send a MIDI CC message
   * @param {number} controller - CC number (0-127)
   * @param {number} value - CC value (0-127)
   */
  sendCC(controller, value, channel) {
    if (!this.output) return;
    this.output.send('cc', {
      controller: Math.max(0, Math.min(127, controller)),
      value: Math.max(0, Math.min(127, value)),
      channel: channel ?? this.channel,
    });
  }

  /**
   * Send a Program Change
   */
  sendProgramChange(program, channel) {
    if (!this.output) return;
    this.output.send('program', {
      number: Math.max(0, Math.min(127, program)),
      channel: channel ?? this.channel,
    });
  }

  /**
   * Send Pitch Bend
   * @param {number} value - Pitch bend value (0-16383, center = 8192)
   */
  sendPitchBend(value, channel) {
    if (!this.output) return;
    this.output.send('pitch', {
      value: Math.max(0, Math.min(16383, value)),
      channel: channel ?? this.channel,
    });
  }

  /* ── Chord Output ───────────────────────────────────────── */

  /**
   * Play a chord (array of MIDI note numbers)
   */
  playChord(notes, velocity = 100, durationMs = 1000, channel) {
    notes.forEach(note => this.sendNote(note, velocity, channel));
    setTimeout(() => {
      notes.forEach(note => this.sendNoteOff(note, channel));
    }, durationMs);
  }

  /* ── Utility ────────────────────────────────────────────── */

  getAvailablePorts() {
    if (!easymidi) return { inputs: [], outputs: [] };
    return {
      inputs: easymidi.getInputs(),
      outputs: easymidi.getOutputs(),
    };
  }

  getStatus() {
    return {
      enabled: this.enabled,
      outputName: this.outputName,
      inputName: this.inputName,
      outputActive: !!this.output,
      inputActive: !!this.input,
    };
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MidiBridge;
