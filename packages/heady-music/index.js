/* ═══════════════════════════════════════════════════════════════
   HEADY MUSIC — Main Orchestrator
   ∞ Heady × Ableton Live 12 :: Sacred Geometry Music ∞
   ═══════════════════════════════════════════════════════════════

   Usage:
     const HeadyMusic = require('heady-music');
     const music = new HeadyMusic();
     await music.start();
     await music.command('play a golden ratio melody in C minor');
   ═══════════════════════════════════════════════════════════════ */

const { EventEmitter } = require('events');
const AbletonBridge = require('./ableton-bridge');
const MidiBridge = require('./midi-bridge');
const SacredSequencer = require('./sacred-sequencer');
const CommandParser = require('./command-parser');
const LivePerformance = require('./live-performance');

class HeadyMusic extends EventEmitter {
  constructor(options = {}) {
    super();

    this.ableton = new AbletonBridge({
      host: options.host || 'localhost',
      port: options.wsPort || 9876,
    });

    this.midi = new MidiBridge({
      outputName: options.midiOut || 'Heady Out',
      inputName: options.midiIn || 'Heady In',
      channel: options.midiChannel || 0,
    });

    this.playing = false;
    this.currentPattern = null;
    this.patternTimer = null;

    // Live Performance Engine
    this.live = new LivePerformance(this.ableton, this.midi, {
      practiceMode: options.practiceMode || false,
      energyProfile: options.energyProfile || 'journey',
    });

    // Forward events
    this.ableton.on('connected', () => this.emit('ableton_connected'));
    this.ableton.on('disconnected', () => this.emit('ableton_disconnected'));
    this.ableton.on('state', (state) => this.emit('ableton_state', state));
    this.ableton.on('tempo', (bpm) => this.emit('tempo_changed', bpm));
    this.midi.on('noteon', (msg) => this.emit('midi_in', msg));
    this.live.on('section_started', (data) => this.emit('live_section', data));
    this.live.on('performance_ended', (data) => this.emit('live_ended', data));
  }

  /* ── Lifecycle ──────────────────────────────────────────── */

  async start() {
    console.log('');
    console.log('  ∞ ═══════════════════════════════════════════ ∞');
    console.log('  ║         HEADY MUSIC × ABLETON LIVE         ║');
    console.log('  ║     Sacred Geometry :: Music Generation     ║');
    console.log('  ∞ ═══════════════════════════════════════════ ∞');
    console.log('');

    // Start MIDI bridge
    const midiOk = this.midi.start();
    if (midiOk) {
      console.log('[HeadyMusic] MIDI bridge active');
    }

    // Connect to Ableton (non-blocking — will retry)
    try {
      await this.ableton.connect();
    } catch (e) {
      console.log('[HeadyMusic] Ableton not available yet — will retry in background');
      console.log('[HeadyMusic] Load HeadyBridge.amxd in Ableton to connect');
    }

    console.log('[HeadyMusic] ✓ Ready');
    console.log('');
    return this;
  }

  async stop() {
    this.stopPattern();
    this.midi.stop();
    this.ableton.disconnect();
    console.log('[HeadyMusic] Stopped');
  }

  /* ── Natural Language Command Interface ─────────────────── */

  /**
   * Execute a natural language music command
   * @param {string} input - e.g., "play a golden ratio melody in C minor"
   * @returns {object} Action result
   */
  async command(input) {
    const parsed = CommandParser.parse(input);
    console.log(`[HeadyMusic] Command: "${input}" → ${parsed.action}`);

    try {
      switch (parsed.action) {
        case 'transport_play':
          await this.ableton.play();
          return { success: true, ...parsed };

        case 'transport_stop':
          await this.ableton.stop();
          this.stopPattern();
          return { success: true, ...parsed };

        case 'transport_record':
          await this.ableton.record();
          return { success: true, ...parsed };

        case 'set_tempo':
          await this.ableton.setTempo(parsed.params.bpm);
          return { success: true, ...parsed };

        case 'tempo_nudge': {
          const current = this.ableton.state.tempo || 120;
          await this.ableton.setTempo(current + parsed.params.delta);
          return { success: true, ...parsed, newTempo: current + parsed.params.delta };
        }

        case 'trigger_clip':
          await this.ableton.triggerClip(parsed.params.track, parsed.params.clip);
          return { success: true, ...parsed };

        case 'fire_scene':
          await this.ableton.fireScene(parsed.params.scene);
          return { success: true, ...parsed };

        case 'stop_clip':
          await this.ableton.stopClip(parsed.params.track, parsed.params.clip);
          return { success: true, ...parsed };

        case 'set_volume':
          await this.ableton.setTrackVolume(parsed.params.track, parsed.params.volume);
          return { success: true, ...parsed };

        case 'mute_track':
        case 'unmute_track':
          await this.ableton.setTrackMute(parsed.params.track, parsed.params.muted);
          return { success: true, ...parsed };

        case 'solo_track':
          await this.ableton.setTrackSolo(parsed.params.track, parsed.params.soloed);
          return { success: true, ...parsed };

        case 'generate_pattern':
          return await this.generateAndPlay(parsed.params);

        case 'get_status':
          return { success: true, ...parsed, status: this.getStatus() };

        // ── Live Performance Commands ──
        case 'live_start': {
          const template = parsed.params.template || 'dj_set';
          const setlist = LivePerformance.createSetlist(template, parsed.params);
          this.live.loadSetlist(setlist);
          await this.live.startPerformance();
          return { success: true, ...parsed, message: `Started ${template} performance` };
        }

        case 'live_next':
          return { success: true, ...parsed, section: await this.live.performNext() };

        case 'live_jump':
          return { success: true, ...parsed, section: await this.live.jumpTo(parsed.params.target) };

        case 'live_pause':
          this.live.pause();
          return { success: true, ...parsed };

        case 'live_resume':
          this.live.resume();
          return { success: true, ...parsed };

        case 'live_end':
          return { success: true, ...parsed, summary: this.live.endPerformance() };

        case 'live_energy':
          return { success: true, ...parsed, energy: this.live.adjustEnergy(parsed.params.delta) };

        case 'live_setlist':
          return { success: true, ...parsed, setlist: this.live.getSetlistView() };

        case 'live_status':
          return { success: true, ...parsed, status: this.live.getStatus() };

        case 'live_load_setlist': {
          const items = parsed.params.setlist || LivePerformance.createSetlist(parsed.params.template, parsed.params);
          this.live.loadSetlist(items);
          return { success: true, ...parsed, message: `Loaded ${items.length} sections` };
        }

        case 'live_practice': {
          const practiceSetlist = LivePerformance.createSetlist('practice', parsed.params);
          this.live.practiceMode = true;
          this.live.practiceSpeed = parsed.params.speed || 0.75;
          this.live.loadSetlist(practiceSetlist);
          await this.live.startPerformance();
          return { success: true, ...parsed, message: 'Practice mode started at ' + (this.live.practiceSpeed * 100) + '% speed' };
        }

        default:
          return { success: false, ...parsed, error: 'Unknown command' };
      }
    } catch (err) {
      return { success: false, ...parsed, error: err.message };
    }
  }

  /* ── Pattern Generation & Playback ──────────────────────── */

  /**
   * Generate a Sacred Geometry pattern and play it via MIDI
   */
  async generateAndPlay(params) {
    const pattern = SacredSequencer.generatePattern(params);
    this.currentPattern = pattern;

    console.log(`[HeadyMusic] Generated ${params.type || 'golden'} pattern: ${pattern.length} notes`);

    // Play via MIDI
    this.playPattern(pattern, params.loop !== false);

    // Also set Ableton tempo if specified
    if (params.tempo) {
      try { await this.ableton.setTempo(params.tempo); } catch (e) { /* ok */ }
    }

    return {
      success: true,
      action: 'generate_pattern',
      params,
      pattern: pattern.map(n => ({
        note: n.note,
        midiNote: n.midiNote,
        hit: n.hit,
        velocity: n.velocity,
        duration: n.duration,
      })),
      description: `Playing ${params.type || 'golden'} pattern (${pattern.length} notes)`,
    };
  }

  /**
   * Play a pattern via MIDI bridge
   */
  playPattern(pattern, loop = true) {
    this.stopPattern();
    this.playing = true;

    const playableNotes = pattern.filter(n => n.hit && n.midiNote);
    if (playableNotes.length === 0) return;

    let index = 0;

    const playNext = () => {
      if (!this.playing) return;

      const note = playableNotes[index];
      this.midi.playNote(note.midiNote, note.velocity || 100, note.duration || 300);

      this.emit('note_played', note);

      index++;
      if (index >= playableNotes.length) {
        if (loop) {
          index = 0;
          console.log('[HeadyMusic] Pattern loop restart');
        } else {
          this.playing = false;
          this.emit('pattern_complete');
          return;
        }
      }

      // Schedule next note
      const gap = note.duration ? note.duration + (note.gap || 50) : 300;
      this.patternTimer = setTimeout(playNext, gap);
    };

    playNext();
  }

  /**
   * Stop current pattern playback
   */
  stopPattern() {
    this.playing = false;
    if (this.patternTimer) {
      clearTimeout(this.patternTimer);
      this.patternTimer = null;
    }
    this.currentPattern = null;
  }

  /* ── Direct API ─────────────────────────────────────────── */

  /** Generate pattern without playing */
  generate(options) {
    return SacredSequencer.generatePattern(options);
  }

  /** Send a raw MIDI note */
  sendNote(note, velocity, duration, channel) {
    this.midi.playNote(note, velocity, duration, channel);
  }

  /** Send a chord */
  sendChord(notes, velocity, duration, channel) {
    this.midi.playChord(notes, velocity, duration, channel);
  }

  /* ── Status ─────────────────────────────────────────────── */

  getStatus() {
    return {
      ableton: this.ableton.getStatus(),
      midi: this.midi.getStatus(),
      playing: this.playing,
      currentPattern: this.currentPattern
        ? { length: this.currentPattern.length, type: 'active' }
        : null,
      live: this.live.getStatus(),
      patternTypes: SacredSequencer.getPatternTypes(),
      scales: SacredSequencer.getScales(),
      commands: CommandParser.getHelp(),
    };
  }
}

/* ── Standalone mode ──────────────────────────────────────── */
if (require.main === module) {
  const music = new HeadyMusic();
  music.start().then(() => {
    // Interactive mode: read commands from stdin
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '∞ heady-music > ',
    });

    rl.prompt();

    rl.on('line', async (line) => {
      const input = line.trim();
      if (!input) { rl.prompt(); return; }
      if (input === 'exit' || input === 'quit') {
        await music.stop();
        process.exit(0);
      }
      if (input === 'help') {
        CommandParser.getHelp().forEach(h => {
          console.log(`  ${h.command.padEnd(45)} ${h.description}`);
        });
        rl.prompt();
        return;
      }
      const result = await music.command(input);
      console.log(JSON.stringify(result, null, 2));
      rl.prompt();
    });
  });
}

module.exports = HeadyMusic;
