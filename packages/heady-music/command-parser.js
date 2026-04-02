/* ═══════════════════════════════════════════════════════════════
   COMMAND PARSER — Natural Language → Ableton Commands
   ∞ Heady × Ableton Live 12 ∞
   ═══════════════════════════════════════════════════════════════ */

/**
 * Parse natural language commands into structured Ableton actions
 */
class CommandParser {

  /**
   * Parse a natural language music command
   * @param {string} input - User's command string
   * @returns {{ action: string, params: object, description: string }}
   */
  static parse(input) {
    const text = input.toLowerCase().trim();

    // ── Transport ──────────────────────────────────────────
    if (/^(play|start|go|resume)$/i.test(text) || /^play\s*(it|music|the music)?$/i.test(text)) {
      return { action: 'transport_play', params: {}, description: 'Play transport' };
    }

    if (/^(stop|pause|halt|quiet)$/i.test(text) || /^stop\s*(it|playing|the music)?$/i.test(text)) {
      return { action: 'transport_stop', params: {}, description: 'Stop transport' };
    }

    if (/^record/i.test(text)) {
      return { action: 'transport_record', params: {}, description: 'Start recording' };
    }

    // ── Tempo ──────────────────────────────────────────────
    const tempoMatch = text.match(/(?:set\s+)?tempo\s+(?:to\s+)?(\d+)/i)
      || text.match(/(\d+)\s*bpm/i);
    if (tempoMatch) {
      return {
        action: 'set_tempo',
        params: { bpm: parseInt(tempoMatch[1], 10) },
        description: `Set tempo to ${tempoMatch[1]} BPM`,
      };
    }

    if (/tempo\s+up/i.test(text) || /faster/i.test(text)) {
      return { action: 'tempo_nudge', params: { delta: 5 }, description: 'Increase tempo by 5 BPM' };
    }

    if (/tempo\s+down/i.test(text) || /slower/i.test(text)) {
      return { action: 'tempo_nudge', params: { delta: -5 }, description: 'Decrease tempo by 5 BPM' };
    }

    // ── Clip / Scene Triggers ──────────────────────────────
    const clipMatch = text.match(/(?:trigger|launch|fire|play)\s+clip\s+(\d+)(?:\s+(?:on\s+)?track\s+(\d+))?/i);
    if (clipMatch) {
      return {
        action: 'trigger_clip',
        params: {
          clip: parseInt(clipMatch[1], 10) - 1,
          track: clipMatch[2] ? parseInt(clipMatch[2], 10) - 1 : 0,
        },
        description: `Trigger clip ${clipMatch[1]}${clipMatch[2] ? ' on track ' + clipMatch[2] : ''}`,
      };
    }

    const sceneMatch = text.match(/(?:trigger|launch|fire|play)\s+scene\s+(\d+)/i);
    if (sceneMatch) {
      return {
        action: 'fire_scene',
        params: { scene: parseInt(sceneMatch[1], 10) - 1 },
        description: `Fire scene ${sceneMatch[1]}`,
      };
    }

    const stopClipMatch = text.match(/stop\s+clip\s+(\d+)(?:\s+(?:on\s+)?track\s+(\d+))?/i);
    if (stopClipMatch) {
      return {
        action: 'stop_clip',
        params: {
          clip: parseInt(stopClipMatch[1], 10) - 1,
          track: stopClipMatch[2] ? parseInt(stopClipMatch[2], 10) - 1 : 0,
        },
        description: `Stop clip ${stopClipMatch[1]}`,
      };
    }

    // ── Track Controls ─────────────────────────────────────
    const volumeMatch = text.match(/(?:set\s+)?(?:track\s+)?(\d+)\s+volume\s+(?:to\s+)?(\d+)/i)
      || text.match(/volume\s+(?:of\s+)?track\s+(\d+)\s+(?:to\s+)?(\d+)/i);
    if (volumeMatch) {
      return {
        action: 'set_volume',
        params: {
          track: parseInt(volumeMatch[1], 10) - 1,
          volume: Math.min(127, parseInt(volumeMatch[2], 10)),
        },
        description: `Set track ${volumeMatch[1]} volume to ${volumeMatch[2]}`,
      };
    }

    const muteMatch = text.match(/mute\s+track\s+(\d+)/i);
    if (muteMatch) {
      return {
        action: 'mute_track',
        params: { track: parseInt(muteMatch[1], 10) - 1, muted: true },
        description: `Mute track ${muteMatch[1]}`,
      };
    }

    const unmuteMatch = text.match(/unmute\s+track\s+(\d+)/i);
    if (unmuteMatch) {
      return {
        action: 'unmute_track',
        params: { track: parseInt(unmuteMatch[1], 10) - 1, muted: false },
        description: `Unmute track ${unmuteMatch[1]}`,
      };
    }

    const soloMatch = text.match(/solo\s+track\s+(\d+)/i);
    if (soloMatch) {
      return {
        action: 'solo_track',
        params: { track: parseInt(soloMatch[1], 10) - 1, soloed: true },
        description: `Solo track ${soloMatch[1]}`,
      };
    }

    // ── Sacred Geometry Pattern Generation ──────────────────
    const patternMatch = text.match(
      /(?:generate|create|make|play)\s+(?:a\s+)?(?:sacred\s+(?:geometry\s+)?)?(\w+)\s+(?:pattern|beat|rhythm)/i
    );
    if (patternMatch) {
      const type = CommandParser._mapPatternType(patternMatch[1]);
      return {
        action: 'generate_pattern',
        params: {
          type,
          ...CommandParser._extractMusicalParams(text),
        },
        description: `Generate ${type} Sacred Geometry pattern`,
      };
    }

    // ── Melody Generation ──────────────────────────────────
    const melodyMatch = text.match(
      /(?:generate|create|make|play)\s+(?:a\s+)?(?:golden\s+(?:ratio\s+)?)?(?:sacred\s+)?melody/i
    );
    if (melodyMatch) {
      return {
        action: 'generate_pattern',
        params: {
          type: 'golden',
          ...CommandParser._extractMusicalParams(text),
        },
        description: 'Generate golden ratio melody',
      };
    }

    // ── Chord Progression ──────────────────────────────────
    const chordMatch = text.match(
      /(?:generate|create|make|play)\s+(?:a\s+)?(?:sacred\s+)?chord(?:s|\s+progression)?/i
    );
    if (chordMatch) {
      return {
        action: 'generate_pattern',
        params: {
          type: 'chord',
          ...CommandParser._extractMusicalParams(text),
        },
        description: 'Generate sacred chord progression',
      };
    }

    // ── General "generate" / "sacred geometry" catch-all ───
    if (/sacred\s*geometry/i.test(text) || /generate.*music/i.test(text) || /make.*beat/i.test(text)) {
      return {
        action: 'generate_pattern',
        params: {
          type: 'fibonacci',
          ...CommandParser._extractMusicalParams(text),
        },
        description: 'Generate Sacred Geometry music',
      };
    }

    // ── Live Performance Commands ──────────────────────────
    if (/^(?:start|begin)\s+(?:the\s+)?(?:set|performance|show|gig)/i.test(text)) {
      const template = /jam/i.test(text) ? 'jam_session' : /practice/i.test(text) ? 'practice' : 'dj_set';
      return {
        action: 'live_start',
        params: { template, ...CommandParser._extractMusicalParams(text) },
        description: `Start live ${template} performance`,
      };
    }

    if (/^(?:next|advance|next\s+section|move\s+on)/i.test(text)) {
      return { action: 'live_next', params: {}, description: 'Advance to next section' };
    }

    const jumpMatch = text.match(/(?:jump|go|skip)\s+(?:to\s+)?(?:section\s+)?(\d+|.+)/i);
    if (jumpMatch) {
      const target = isNaN(jumpMatch[1]) ? jumpMatch[1] : parseInt(jumpMatch[1], 10) - 1;
      return { action: 'live_jump', params: { target }, description: `Jump to "${jumpMatch[1]}"` };
    }

    if (/^(?:pause|hold)\s*(?:the\s+)?(?:set|performance)?/i.test(text)) {
      return { action: 'live_pause', params: {}, description: 'Pause performance' };
    }

    if (/^(?:resume|continue|unpause)/i.test(text)) {
      return { action: 'live_resume', params: {}, description: 'Resume performance' };
    }

    if (/^(?:end|finish|stop)\s+(?:the\s+)?(?:set|performance|show)/i.test(text)) {
      return { action: 'live_end', params: {}, description: 'End performance' };
    }

    if (/energy\s+up|more\s+energy|hype|pump|louder|bigger/i.test(text)) {
      return { action: 'live_energy', params: { delta: 0.15 }, description: 'Increase energy +15%' };
    }

    if (/energy\s+down|less\s+energy|chill|calm|quieter|smaller/i.test(text)) {
      return { action: 'live_energy', params: { delta: -0.15 }, description: 'Decrease energy -15%' };
    }

    if (/show\s+(?:the\s+)?setlist|what.*(?:set|lineup)/i.test(text)) {
      return { action: 'live_setlist', params: {}, description: 'Show setlist' };
    }

    if (/live\s+status|performance\s+status|where\s+(?:are\s+)?(?:we|am\s+I)/i.test(text)) {
      return { action: 'live_status', params: {}, description: 'Get live performance status' };
    }

    if (/practice\s+mode|start\s+practice|drill/i.test(text)) {
      return {
        action: 'live_practice',
        params: { speed: 0.75, ...CommandParser._extractMusicalParams(text) },
        description: 'Start practice mode (75% speed)',
      };
    }

    if (/load.*(?:dj|jam|set)/i.test(text)) {
      const template = /jam/i.test(text) ? 'jam_session' : 'dj_set';
      return {
        action: 'live_load_setlist',
        params: { template, ...CommandParser._extractMusicalParams(text) },
        description: `Load ${template} setlist`,
      };
    }

    // ── Status ─────────────────────────────────────────────
    if (/status|state|info|what.*playing/i.test(text)) {
      return { action: 'get_status', params: {}, description: 'Get Ableton status' };
    }

    // ── Drop the beat (fun command!) ───────────────────────
    if (/drop\s+the\s+beat/i.test(text)) {
      return {
        action: 'generate_pattern',
        params: { type: 'euclidean', key: 'C', scale: 'pentatonic', length: 16, tempo: 140 },
        description: '∞ DROP THE BEAT — Euclidean Sacred Geometry ∞',
      };
    }

    // ── Unknown ────────────────────────────────────────────
    return {
      action: 'unknown',
      params: { raw: input },
      description: `Unrecognized command: "${input}"`,
    };
  }

  /* ── Internal Helpers ───────────────────────────────────── */

  static _extractMusicalParams(text) {
    const params = {};

    // Key detection
    const keyMatch = text.match(/\bin\s+([A-Ga-g][#b]?)\s*(major|minor|dorian|mixolydian|pentatonic|blues|sacred)?/i);
    if (keyMatch) {
      params.key = keyMatch[1].toUpperCase();
      if (keyMatch[2]) params.scale = keyMatch[2].toLowerCase();
    }

    // Scale detection (without key)
    if (!params.scale) {
      const scaleMatch = text.match(/\b(major|minor|dorian|mixolydian|pentatonic|blues|sacred|harmonic.minor)\b/i);
      if (scaleMatch) params.scale = scaleMatch[1].toLowerCase().replace('.', '_');
    }

    // Tempo detection
    const tempoM = text.match(/(\d+)\s*bpm/i) || text.match(/tempo\s+(\d+)/i);
    if (tempoM) params.tempo = parseInt(tempoM[1], 10);

    // Length detection
    const lenM = text.match(/(\d+)\s*(?:notes?|steps?|bars?)/i);
    if (lenM) params.length = parseInt(lenM[1], 10);

    return params;
  }

  static _mapPatternType(word) {
    const w = word.toLowerCase();
    if (w.startsWith('fib')) return 'fibonacci';
    if (w.startsWith('euc')) return 'euclidean';
    if (w.startsWith('gold')) return 'golden';
    if (w.startsWith('spir')) return 'spiral';
    if (w.startsWith('chord')) return 'chord';
    return 'fibonacci'; // default
  }

  /**
   * Get list of supported commands for help/docs
   */
  static getHelp() {
    return [
      { command: 'play / stop / record', description: 'Transport controls' },
      { command: 'set tempo to 120 / 120 bpm', description: 'Set BPM' },
      { command: 'faster / slower', description: 'Nudge tempo ±5 BPM' },
      { command: 'trigger clip 3 on track 1', description: 'Launch a clip' },
      { command: 'fire scene 2', description: 'Launch a scene' },
      { command: 'mute track 3 / unmute track 3', description: 'Track muting' },
      { command: 'solo track 1', description: 'Solo a track' },
      { command: 'generate fibonacci pattern in A minor', description: 'Sacred Geometry beat' },
      { command: 'play a golden ratio melody in C minor', description: 'φ-derived melody' },
      { command: 'generate sacred chord progression in G major', description: 'Sacred chords' },
      { command: 'create spiral melody at 90 bpm', description: 'Golden spiral melody' },
      { command: 'drop the beat', description: '∞ Euclidean Sacred Geometry ∞' },
      { command: 'status', description: 'Get current Ableton state' },
      { command: '─── Live Performance ───', description: '──────────────────────────────' },
      { command: 'start the set / start dj set', description: 'Begin live performance with setlist' },
      { command: 'start jam session', description: 'Begin freeform jam performance' },
      { command: 'next / advance', description: 'Advance to next setlist section' },
      { command: 'jump to section 3 / jump to Main Peak', description: 'Jump to a specific section' },
      { command: 'pause the set / resume', description: 'Pause/resume performance' },
      { command: 'end the set', description: 'End performance and show stats' },
      { command: 'energy up / energy down', description: 'Adjust energy level ±15%' },
      { command: 'more energy / chill out', description: 'Adjust crowd energy' },
      { command: 'show setlist', description: 'Display full setlist with energy curve' },
      { command: 'live status', description: 'Current section, next transition, energy' },
      { command: 'practice mode', description: 'Start structured practice at 75% speed' },
      { command: 'load dj set / load jam session', description: 'Load a setlist template' },
    ];
  }
}

module.exports = CommandParser;
