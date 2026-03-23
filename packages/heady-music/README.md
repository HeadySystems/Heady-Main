# 🎵 Heady Music — Ableton Live Integration

**∞ Sacred Geometry :: Music Generation :: AI Orchestration ∞**

Connect the Heady AI ecosystem to Ableton Live 12 via Max for Live.
Generate music patterns using golden ratio mathematics, control Ableton
with natural language, and create sacred geometry-inspired compositions.

## Quick Start

```bash
# Install dependencies
cd packages/heady-music
npm install

# Run standalone (interactive REPL)
npm start
```

## Architecture

```
Ableton Live 12          HeadyMusic (Node.js)
┌─────────────────┐      ┌──────────────────┐
│ HeadyBridge.amxd│◄────►│ AbletonBridge     │  WebSocket
│ (Max for Live)  │      │ MidiBridge        │  MIDI
│                 │      │ SacredSequencer   │  Pattern Gen
└─────────────────┘      │ CommandParser     │  NL Commands
                         └──────────────────┘
```

## Setup

### 1. Load Max for Live Device
1. Open Ableton Live 12
2. Drag `max-for-live/HeadyBridge/HeadyBridge.maxpat` onto any track
3. The status LED turns green when the WebSocket server is running

### 2. Connect HeadyMusic
```javascript
const HeadyMusic = require('heady-music');
const music = new HeadyMusic();
await music.start();
```

### 3. Play Music!
```javascript
// Natural language commands
await music.command('play a golden ratio melody in C minor');
await music.command('generate fibonacci beat at 120 bpm');
await music.command('drop the beat');

// Direct API
const pattern = music.generate({ type: 'spiral', key: 'A', scale: 'sacred' });
music.sendNote(60, 100, 500); // Middle C
music.sendChord([60, 64, 67], 100, 1000); // C major chord
```

## Pattern Types

| Type | Description |
|------|-------------|
| `fibonacci` | Beat patterns at Fibonacci positions |
| `euclidean` | Bjorklund rhythms with φ-derived pulse counts |
| `golden` | Melodic intervals derived from golden ratio |
| `spiral` | Golden angle spiral through scale degrees |
| `chord` | Sacred interval chord progressions |

## Commands

| Command | Action |
|---------|--------|
| `play` / `stop` / `record` | Transport control |
| `set tempo to 120` | Set BPM |
| `trigger clip 3 on track 1` | Launch clip |
| `fire scene 2` | Launch scene |
| `mute track 3` | Mute/unmute |
| `generate fibonacci pattern in A minor` | Sacred beat |
| `play a golden ratio melody` | φ melody |
| `drop the beat` | ∞ Go time ∞ |

## Sacred Geometry Math

All patterns are derived from φ (1.618):
- **Fibonacci rhythms**: Hits at positions 0, 1, 1, 2, 3, 5, 8, 13...
- **Golden melodies**: Scale intervals × φ for organic movement
- **Phi timing**: Note durations in golden ratio proportions
- **Sacred scale**: [0, 2, 3, 5, 8, 9, 11] — Fibonacci-adjacent intervals
- **Euclidean**: Pulse count = steps × (1/φ) for balanced distribution
