# Drum AI Copilot

A MuseScore 4 plugin that writes and edits snare drum notation from plain English.

Open a score, type what you want, press Enter:

| You type | You get |
|---|---|
| `4 measures of paradiddles with an accent on beat 1` | RLRR LRLL sixteenths, accented downbeats, sticking under every note |
| `make these eighth note triplets` (with measures selected) | the selected measures replaced with triplets |
| `add flams to the first note of each beat` | your existing notes, untouched, plus flams |
| `a measure of five stroke rolls` | diddled sixteenths into accented eighths |
| `put quintuplets in measures 6-9` | measures appended if the score is too short |

Supports single/double strokes, the paradiddle family, rolls, accents, flams, diddles (tremolo
slashes), ghost notes (parentheses), and 3/5/7 tuplets, in any simple or compound time signature.
Every generation is validated before it touches the score, and the whole thing is one undo step.

## How it works

```
MuseScore plugin (QML)          Vercel backend (Node)              Model
──────────────────────          ─────────────────────              ──────
reads score → compact tokens ─► builds prompt + examples ─────────► returns JSON
                                validates every measure  ◄─────────  { startMeasure,
writes notes, tuplets,       ◄─ asks the model to fix, else             measures[] }
sticking, embellishments        repairs deterministically
```

The plugin and backend share one compact notation (below). The model decides *where* the music
goes from your prompt and your selection; the backend guarantees every measure adds up.

## Install

1. **Backend key.** Get an Anthropic API key at [console.anthropic.com](https://console.anthropic.com/).
   Each generation costs well under a cent.
2. **Plugin.** Clone this repo and run `bash plugin/install.sh` (symlinks the plugin into
   `~/Documents/MuseScore4/Plugins/drum-ai-copilot/`), or copy `plugin/drum-ai-copilot.qml`
   there yourself.
3. In MuseScore: **Plugins → Manage plugins…**, enable *Drum AI Copilot*, then run it from the
   Plugins menu. Paste your key under **Settings** once; it is saved to `~/.drum-ai-copilot.json`.

Requires MuseScore **4.6 or newer** (older 4.x mostly works; ghost-note parentheses need 4.6).

## Using it

- With nothing selected, say where you want the music (`measures 3-4`, `the last bar`) or just
  give a count (`4 measures of …`) and it goes after whatever is already written.
- **Select measures first** and say `these` / `this` — or nothing at all — and the selection is
  the target.
- Edits (`add accents`, `remove the flams`, `reverse the sticking`, `make beats 1-2 triplets`)
  start from what is already in the measure and change only what you asked.
- Cmd+Z / Ctrl+Z undoes a whole generation.
- The **Examples…** menu in the plugin has a dozen prompts to start from.

## Notation

This is the "wire format" between the plugin, the backend and the model. You never have to type
it, but it is what you'll see under *Show details*.

| | |
|---|---|
| Note | hand + duration + embellishments: `RS`, `LE3`, `RQX`, `LSXF` |
| Hand | `R` or `L` (written as sticking lyrics under the note) |
| Duration | `W` whole · `H` half · `Q` quarter · `E` eighth · `S` sixteenth · `T` thirty-second |
| Tuplet | append `3`, `5` or `7` to `Q`/`E`/`S`: `E3` eighth triplet (12 per 4/4 bar), `E5` quintuplet (20), `E7` septuplet (28), `S3` sixteenth triplet (24) |
| Rest | duration + `R`: `QR`, `ER`, `E3R` |
| Embellishments | `X` accent · `F` flam · `D` diddle · `G` ghost note |
| Measure | tokens separated by spaces; `""` is a whole-measure rest |

Rules the backend enforces: a measure must add up exactly to the time signature; tuplet runs
come in complete groups (a run of `E3` is a multiple of 3, `E5` of 5, …); every note has a hand.

## Development

```bash
cd drum-ai-backend
npm install
npm test                       # grammar, validator, repair, generate() with a stubbed client
npm start                      # http://localhost:3001 (reads .env if present)
ANTHROPIC_API_KEY=sk-ant-… npm run smoke   # real end-to-end prompts against the local server
```

Point the plugin at a local server via **Settings → Backend URL** (`http://localhost:3001`).

Endpoints: `GET /` health (version + model) · `POST /generate` · `POST /validate`
(`{ "measure": "RS LS …", "timeSignature": "4/4" }`).

Environment (Vercel → Settings → Environment Variables, or `.env` locally):

| Variable | Purpose |
|---|---|
| `CLAUDE_MODEL` | override the model (default `claude-sonnet-5`) |
| `ANTHROPIC_API_KEY` | optional server-side fallback; normally the plugin sends the user's key |

### Layout

```
plugin/drum-ai-copilot.qml   the MuseScore plugin (single file)
plugin/install.sh            symlinks it into MuseScore's plugin folder
drum-ai-backend/
  api/index.js               Express app (Vercel entry)
  server.js                  local dev server
  src/notation.js            token grammar: parse / validate / repair (pure, tested)
  src/prompt.js              system prompt + few-shot examples
  src/schema.js              structured-output schema + request validation
  src/generate.js            model call, validation, one self-repair turn
  scripts/smoke.js           end-to-end checks with a real key
  test/                      node:test suites
```

## Deploy

The backend deploys to Vercel automatically on every push to `main` (project root directory:
`drum-ai-backend`). Nothing else is needed — the plugin talks to
`https://drum-ai-backend.vercel.app` by default.

## License

MIT — Viraaj Singh
