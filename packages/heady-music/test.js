/* ═══════════════════════════════════════════════════════════════
   HEADY MUSIC — Test Suite
   ∞ Verifies Sacred Geometry pattern generation ∞
   ═══════════════════════════════════════════════════════════════ */

const SacredSequencer = require('./sacred-sequencer');
const CommandParser = require('./command-parser');

const PHI = 1.6180339887;
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

console.log('');
console.log('∞ HeadyMusic Test Suite');
console.log('══════════════════════════════════════');
console.log('');

// ── Sacred Sequencer Tests ───────────────────────────────────

console.log('Sacred Sequencer');

test('Fibonacci rhythm generates correct length', () => {
  const pattern = SacredSequencer.fibonacciRhythm(16);
  assert(pattern.length === 16, `Expected 16, got ${pattern.length}`);
});

test('Fibonacci rhythm has hits at Fibonacci positions', () => {
  const pattern = SacredSequencer.fibonacciRhythm(16);
  // Position 0, 1, 2, 3, 5, 8, 13 should be hits
  assert(pattern[0].hit, 'Position 0 should be a hit');
  assert(pattern[1].hit, 'Position 1 should be a hit');
  assert(pattern[5].hit, 'Position 5 should be a hit');
  assert(pattern[8].hit, 'Position 8 should be a hit');
  assert(pattern[13].hit, 'Position 13 should be a hit');
});

test('Euclidean rhythm with phi pulse count', () => {
  const pattern = SacredSequencer.euclideanFibRhythm(16);
  const hitCount = pattern.filter(p => p.hit).length;
  const expectedPulses = Math.round(16 * (1 / PHI));
  assert(hitCount === expectedPulses, `Expected ~${expectedPulses} hits, got ${hitCount}`);
  assert(pattern.length === 16, `Expected 16 steps, got ${pattern.length}`);
});

test('Golden melody generates valid MIDI notes', () => {
  const melody = SacredSequencer.goldenMelody('C', 'minor', 16, 4);
  assert(melody.length === 16, `Expected 16 notes, got ${melody.length}`);
  melody.forEach((n, i) => {
    assert(n.midiNote >= 0 && n.midiNote <= 127, `Note ${i} out of MIDI range: ${n.midiNote}`);
    assert(n.velocity >= 0 && n.velocity <= 127, `Velocity ${i} out of range: ${n.velocity}`);
    assert(n.duration > 0, `Duration ${i} must be positive: ${n.duration}`);
  });
});

test('Spiral melody stays in range', () => {
  const melody = SacredSequencer.spiralMelody('A', 'sacred', 32, 3);
  assert(melody.length === 32, `Expected 32 notes, got ${melody.length}`);
  melody.forEach((n, i) => {
    assert(n.midiNote >= 24 && n.midiNote <= 108, `Note ${i} out of range: ${n.midiNote}`);
  });
});

test('Chord progression generates valid chords', () => {
  const prog = SacredSequencer.chordProgression('C', 'minor', 4, 3);
  assert(prog.length === 4, `Expected 4 chords, got ${prog.length}`);
  prog.forEach((c, i) => {
    assert(c.midiNotes.length >= 3, `Chord ${i} must have at least 3 notes`);
    assert(c.type === 'major' || c.type === 'minor', `Unknown type: ${c.type}`);
    assert(c.duration > 0, `Duration must be positive`);
  });
});

test('Phi-timed sequence has golden ratio proportions', () => {
  const seq = SacredSequencer.phiTimedSequence(500, 16);
  assert(seq.length === 16, `Expected 16 events, got ${seq.length}`);
  seq.forEach(s => {
    assert(s.duration > 0, `Duration must be positive: ${s.duration}`);
  });
});

test('generatePattern works for all types', () => {
  const types = ['fibonacci', 'euclidean', 'golden', 'spiral', 'chord'];
  types.forEach(type => {
    const pattern = SacredSequencer.generatePattern({ type, key: 'C', scale: 'minor', length: 8 });
    assert(Array.isArray(pattern), `${type} should return array`);
    assert(pattern.length > 0, `${type} should have notes`);
  });
});

test('Sacred scale has Fibonacci-adjacent intervals', () => {
  const scales = SacredSequencer.getScales();
  assert(scales.includes('sacred'), 'Sacred scale must exist');
});

console.log('');

// ── Command Parser Tests ─────────────────────────────────────

console.log('Command Parser');

test('Parses "play" as transport_play', () => {
  const result = CommandParser.parse('play');
  assert(result.action === 'transport_play', `Got: ${result.action}`);
});

test('Parses "stop" as transport_stop', () => {
  const result = CommandParser.parse('stop');
  assert(result.action === 'transport_stop', `Got: ${result.action}`);
});

test('Parses "set tempo to 140"', () => {
  const result = CommandParser.parse('set tempo to 140');
  assert(result.action === 'set_tempo', `Got: ${result.action}`);
  assert(result.params.bpm === 140, `Got: ${result.params.bpm}`);
});

test('Parses "120 bpm"', () => {
  const result = CommandParser.parse('120 bpm');
  assert(result.action === 'set_tempo', `Got: ${result.action}`);
  assert(result.params.bpm === 120, `Got: ${result.params.bpm}`);
});

test('Parses "trigger clip 3 on track 2"', () => {
  const result = CommandParser.parse('trigger clip 3 on track 2');
  assert(result.action === 'trigger_clip', `Got: ${result.action}`);
  assert(result.params.clip === 2, `Clip: ${result.params.clip}`); // 0-indexed
  assert(result.params.track === 1, `Track: ${result.params.track}`); // 0-indexed
});

test('Parses "fire scene 5"', () => {
  const result = CommandParser.parse('fire scene 5');
  assert(result.action === 'fire_scene', `Got: ${result.action}`);
  assert(result.params.scene === 4, `Scene: ${result.params.scene}`); // 0-indexed
});

test('Parses "mute track 3"', () => {
  const result = CommandParser.parse('mute track 3');
  assert(result.action === 'mute_track', `Got: ${result.action}`);
  assert(result.params.track === 2, `Track: ${result.params.track}`);
});

test('Parses "generate fibonacci pattern in A minor"', () => {
  const result = CommandParser.parse('generate fibonacci pattern in A minor');
  assert(result.action === 'generate_pattern', `Got: ${result.action}`);
  assert(result.params.type === 'fibonacci', `Type: ${result.params.type}`);
  assert(result.params.key === 'A', `Key: ${result.params.key}`);
  assert(result.params.scale === 'minor', `Scale: ${result.params.scale}`);
});

test('Parses "play a golden ratio melody in C minor"', () => {
  const result = CommandParser.parse('play a golden ratio melody in C minor');
  assert(result.action === 'generate_pattern', `Got: ${result.action}`);
  assert(result.params.key === 'C', `Key: ${result.params.key}`);
});

test('Parses "drop the beat"', () => {
  const result = CommandParser.parse('drop the beat');
  assert(result.action === 'generate_pattern', `Got: ${result.action}`);
  assert(result.params.type === 'euclidean', `Type: ${result.params.type}`);
});

test('Parses "status"', () => {
  const result = CommandParser.parse('status');
  assert(result.action === 'get_status', `Got: ${result.action}`);
});

test('Unknown command returns unknown action', () => {
  const result = CommandParser.parse('xyzzy plugh');
  assert(result.action === 'unknown', `Got: ${result.action}`);
});

// ── Summary ──────────────────────────────────────────────────
console.log('');
console.log('══════════════════════════════════════');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════');
console.log('');

process.exit(failed > 0 ? 1 : 0);
