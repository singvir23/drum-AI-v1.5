# Drum AI Copilot

An AI-powered MuseScore plugin that generates drum notation from natural language. Type commands like "Generate 4 measures of paradiddles" and get professional sheet music instantly.

## What It Does

Transform natural language into drum notation:

| You Type | You Get |
|----------|---------|
| "Generate 16th note single strokes" | RLRL RLRL... |
| "Create paradiddles for 4 measures" | RLRR LRLL pattern |
| "Generate triplets with accents" | Accented triplet groups |
| "Make the first two measures into quintuplets" | 5:2 tuplet conversion |

## Architecture

```
MuseScore Plugin (QML)
       ↓ HTTPS
Vercel Backend (Node.js)
       ↓
Claude 4.5 Sonnet
       ↓ JSON Notation
Back to Plugin → Rendered in MuseScore
```

The plugin communicates directly with Claude via the backend. No intermediate compilation step - the plugin handles JSON-to-score conversion internally.

## Components

### 1. MuseScore Plugin ([drum-ai-copilot.qml](drum-ai-copilot.qml))
The main user-facing component. Provides:
- Natural language prompt input
- Direct note insertion into MuseScore
- Tuplet support (triplets, quintuplets, sevenlets)
- Embellishments (accents, flams, diddles)
- Full undo support

### 2. Backend API ([drum-ai-backend/](drum-ai-backend/))
Express server deployed on Vercel:
- **generate-xml.js** - Claude API integration with few-shot learning
- **fewShotExamples.js** - Curated examples for pattern generation
- Returns JSON notation (plugin handles rendering)

### 3. Deprecated: Lambda Compiler ([deployment/](deployment/))
Previously used to convert JSON to MusicXML. No longer called - kept for reference.

### 4. Deprecated: React Frontend ([drum-ai-frontend/](drum-ai-frontend/))
Original web interface. Plugin replaces this for MuseScore users.

## Installation

### Plugin Setup
Copy `drum-ai-copilot.qml` to your MuseScore plugins folder:

**macOS:**
```bash
cp drum-ai-copilot.qml ~/Documents/MuseScore4/Plugins/drum-ai-copilot/
```

**Windows:**
```
%APPDATA%\MuseScore\MuseScore4\Plugins\
```

Then restart MuseScore and enable via Plugins → Plugin Manager.

### API Key
1. Get a key from [console.anthropic.com](https://console.anthropic.com/)
2. Open the plugin in MuseScore
3. Paste your API key in the settings field

## Notation System

### Durations
| Symbol | Duration | Per Measure (4/4) |
|--------|----------|-------------------|
| W | Whole | 1 |
| H | Half | 2 |
| Q | Quarter | 4 |
| E | Eighth | 8 |
| S | Sixteenth | 16 |

### Tuplets
| Suffix | Type | Ratio | Per Measure |
|--------|------|-------|-------------|
| 3 | Triplet | 3:2 | 12 |
| 5 | Quintuplet | 5:2 | 20 |
| 7 | Sevenlet | 7:2 | 28 |

### Embellishments
- **X** - Accent
- **F** - Flam
- **D** - Diddle
- **G** - Ghost note

## Development

### Backend
```bash
cd drum-ai-backend
npm install
npm start  # runs on localhost:3001
```

Environment variables (`.env`):
```
ANTHROPIC_API_KEY=sk-ant-...
```

### Deploy
Push to main branch - Vercel deploys automatically.

## Limitations
- Max 16 measures per request (prevents token overflow)
- Snare drum only (single line)
- Requires internet connection

## License
MIT

## Author
Viraaj Singh
