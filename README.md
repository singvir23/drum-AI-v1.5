# Drum AI - Intelligent Drum Notation Generator

An AI-powered drum notation generator that converts natural language prompts into professional sheet music. Built with Claude 4.5 Sonnet, this system uses few-shot learning and structured output to generate accurate, scalable drum notation for up to 32 measures.

## Overview

Drum AI solves a common problem for drummers: quickly generating and visualizing drum patterns. Instead of manually writing sheet music or searching for specific rudiments online, users can simply describe what they want in plain English, and the system generates professional MusicXML notation instantly.

**Example:**
- Input: "Generate 16th note single strokes with accents on beats 1 and 3"
- Output: Professional sheet music rendered in the browser

## Architecture

### System Design

The system uses a three-stage pipeline optimized for speed, cost, and accuracy:

```
User Prompt (Natural Language)
    ↓
Claude 4.5 Sonnet (Few-Shot Learning + Structured Output)
    ↓
JSON Drum Notation (Compact & Structured)
    ↓
Python Compiler (AWS Lambda)
    ↓
MusicXML (Industry Standard)
    ↓
OpenSheetMusicDisplay (Browser Rendering)
```

### Components

#### 1. **Frontend** ([drum-ai-frontend/](drum-ai-frontend/))
   - **Tech Stack:** React, OpenSheetMusicDisplay
   - **Purpose:** User interface for entering prompts and displaying rendered sheet music
   - **Key Files:**
     - [src/MusicSheet.js](drum-ai-frontend/src/MusicSheet.js) - Main UI component

#### 2. **Backend API** ([drum-ai-backend/](drum-ai-backend/))
   - **Tech Stack:** Node.js, Express, Anthropic SDK
   - **Deployment:** Vercel
   - **Purpose:** Orchestrates AI generation and compilation
   - **Key Files:**
     - [generate-xml.js](drum-ai-backend/generate-xml.js) - Main API endpoint
     - [fewShotExamples.js](drum-ai-backend/fewShotExamples.js) - Few-shot example selection logic
   - **Environment Variables:**
     ```
     ANTHROPIC_API_KEY=<your_claude_api_key>
     AWS_LAMBDA_URL=<your_lambda_function_url>
     ```

#### 3. **Compiler** ([deployment/](deployment/))
   - **Tech Stack:** Python 3.13, AWS Lambda
   - **Purpose:** Converts JSON notation to MusicXML
   - **Key Files:**
     - [music_xml_converter.py](deployment/music_xml_converter.py) - Core compiler with JSON support
     - [lambda_function.py](deployment/lambda_function.py) - Lambda handler
   - **Features:**
     - Precise measure normalization using Python Fractions
     - Automatic beaming and triplet notation
     - Support for embellishments (accents, flams, diddles, ghost notes)

## Why This Approach?

### Evolution from Fine-Tuning to Few-Shot Learning

**Previous Approach (Fine-Tuned GPT-4):**
- ❌ Overfitted on ~1,257 training examples
- ❌ Poor generalization to new patterns
- ❌ Required retraining for new rudiments
- ❌ Limited to patterns in training data

**Current Approach (Claude 4.5 Sonnet + Few-Shot):**
- ✅ Generalizes to ANY drum pattern
- ✅ No training required - uses base model + examples
- ✅ Handles 32+ measures easily
- ✅ Structured output ensures reliability
- ✅ Cost-effective and fast (~2-5 seconds)

### Why JSON Instead of String Notation?

**String Notation (Old):**
```
RSX LS RS LS RSX LS RS LS
```
- Compact but unstructured
- Hard to validate
- Limited extensibility

**JSON Notation (New):**
```json
{
  "timeSignature": [4, 4],
  "measures": [
    {
      "notes": [
        { "sticking": "R", "duration": "S", "embellishments": ["X"] },
        { "sticking": "L", "duration": "S" }
      ]
    }
  ]
}
```
- Structured and validated by schema
- Easy to extend (dynamics, articulations, etc.)
- More reliable parsing
- Better error handling

## Viraaj's Drum Notation System

### Note Durations

| Symbol | Name | Measure Fraction |
|--------|------|------------------|
| W | Whole Note | 1/1 (4 beats) |
| H | Half Note | 1/2 (2 beats) |
| Q | Quarter Note | 1/4 (1 beat) |
| E | Eighth Note | 1/8 (0.5 beats) |
| S | Sixteenth Note | 1/16 (0.25 beats) |
| T | Thirty-Second Note | 1/32 (0.125 beats) |

### Triplets

Add `3` suffix to create triplets (3 notes in the space of 2):

| Symbol | Name | Measure Fraction |
|--------|------|------------------|
| Q3 | Quarter Triplet | 1/6 |
| E3 | Eighth Triplet | 1/12 |
| S3 | Sixteenth Triplet | 1/24 |

### Sticking

- **R** - Right hand
- **L** - Left hand

### Embellishments

- **X** - Accent (louder/emphasized note)
- **F** - Flam (grace note before main note)
- **D** - Diddle (double stroke/tremolo)
- **G** - Ghost note (softer dynamic, shown with parentheses)

### Rests

Append `R` to duration:
- **QR** - Quarter rest
- **HR** - Half rest
- **ER** - Eighth rest

### Examples

**Single Strokes (16th notes):**
```
RS LS RS LS RS LS RS LS RS LS RS LS RS LS RS LS
```

**Paradiddles:**
```
RS LS RS RS LS RS LS LS
```

**Accented Single Strokes:**
```
RSX LS RS LS RSX LS RS LS
```

**Eighth Note Triplets:**
```
RE3 LE3 RE3 LE3 RE3 LE3 RE3 LE3 RE3 LE3 RE3 LE3
```

## Few-Shot Learning

The system uses intelligent example selection to improve generation quality:

1. **Keyword Matching:** Analyzes user prompt for keywords (e.g., "single stroke", "triplet", "flam")
2. **Category Scoring:** Scores curated examples based on relevance
3. **Context Injection:** Injects 3-5 most relevant examples into Claude's context
4. **Structured Output:** Enforces JSON schema for reliability

**Curated Example Categories:**
- Single Strokes
- Paradiddles
- Triplets
- Accents
- Flams
- Diddles
- Mixed Durations

## Installation & Setup

### Prerequisites

- Node.js 18+
- Python 3.13+
- npm or yarn
- Anthropic API key
- AWS account (for Lambda deployment)

### Backend Setup

```bash
cd drum-ai-backend
npm install
```

Create `.env`:
```
ANTHROPIC_API_KEY=your_api_key_here
AWS_LAMBDA_URL=your_lambda_url_here
```

Run locally:
```bash
npm start
```

### Lambda Deployment

```bash
cd deployment

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Deploy to AWS Lambda
# (Use AWS SAM, Serverless Framework, or manual zip upload)
```

**Lambda Configuration:**
- Runtime: Python 3.13
- Handler: `lambda_function.lambda_handler`
- Timeout: 30 seconds
- Memory: 512 MB

### Frontend Setup

```bash
cd drum-ai-frontend
npm install
```

Create `.env`:
```
REACT_APP_API_URL=your_backend_url_here
```

Run locally:
```bash
npm start
```

## API Reference

### POST `/generate-xml`

Generates drum notation from a text prompt.

**Request:**
```json
{
  "prompt": "Generate 16th note single strokes with accents on beats 1 and 3"
}
```

**Response:**
```json
{
  "xml": "<?xml version='1.0'?>...",
  "notation": {
    "timeSignature": [4, 4],
    "measures": [...]
  }
}
```

### Lambda Endpoint

**Request (JSON Format):**
```json
{
  "jsonNotation": {
    "timeSignature": [4, 4],
    "measures": [
      {
        "notes": [
          { "sticking": "R", "duration": "S" }
        ]
      }
    ]
  }
}
```

**Request (Legacy String Format):**
```json
{
  "notation": "RS LS RS LS"
}
```

**Response:**
```json
{
  "xml": "<?xml version='1.0'?>..."
}
```

## File Structure

```
drum-AI/
├── drum-ai-frontend/          # React frontend
│   └── src/
│       └── MusicSheet.js      # Main UI component
├── drum-ai-backend/           # Express backend
│   ├── generate-xml.js        # API endpoint
│   ├── fewShotExamples.js     # Few-shot logic
│   └── index.js               # Server entry point
├── deployment/                # AWS Lambda compiler
│   ├── music_xml_converter.py # JSON → MusicXML compiler
│   ├── lambda_function.py     # Lambda handler
│   └── requirements.txt       # Python dependencies
├── training_model/            # Training data (reference)
│   ├── training_data/         # JSONL training files
│   └── xmlTrainingData/       # XML examples by category
│       ├── singleStrokes/
│       ├── paradiddles/
│       ├── triplets/
│       ├── flams/
│       ├── diddles/
│       ├── accents/
│       └── fullTranscriptions/
└── README.md
```

## Performance

- **Generation Time:** 2-5 seconds (end-to-end)
- **Max Output:** 32 measures
- **Token Usage:** ~500-2000 tokens per request
- **Cost:** ~$0.002-$0.01 per request (Claude 4.5 Sonnet)

## Supported Patterns

The system can generate ANY drum pattern, including:

- **Rudiments:** Single strokes, paradiddles, flams, drags, rolls, etc.
- **Grooves:** Rock beats, jazz patterns, Latin rhythms
- **Complex Patterns:** Polyrhythms, metric modulation, mixed meters
- **Embellishments:** Accents, ghost notes, flams, drags, diddles
- **Time Signatures:** 4/4, 3/4, 6/8, 7/8, etc.

## Technical Details

### Measure Normalization

The compiler uses Python's `Fraction` class for precise arithmetic:

```python
# Example: Normalize a measure to exactly 1.0 (4/4 time)
total_weight = Fraction(0)
for note in measure:
    total_weight += WEIGHT_MAP[note.duration]

if total_weight < 1:
    # Fill remaining space with rest
    remaining = 1 - total_weight
    rest_duration = find_rest_duration(remaining)
```

### Beaming Logic

Notes are beamed according to standard music notation rules:
- Eighth notes and smaller are beamed together
- Beams respect beat boundaries
- Triplets get special tuplet brackets

### Claude Structured Output Schema

```typescript
{
  type: "object",
  properties: {
    timeSignature: {
      type: "array",
      items: { type: "integer" },
      minItems: 2,
      maxItems: 2
    },
    measures: {
      type: "array",
      items: {
        type: "object",
        properties: {
          notes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                sticking: { type: "string", enum: ["R", "L"] },
                duration: { type: "string", enum: ["W", "H", "Q", "E", "S", "T", "Q3", "E3", "S3", ...] },
                embellishments: { type: "array", items: { type: "string", enum: ["X", "F", "D", "G"] } }
              },
              required: ["sticking", "duration"]
            }
          }
        },
        required: ["notes"]
      }
    }
  },
  required: ["timeSignature", "measures"]
}
```

## Future Improvements

- [ ] Add support for dynamics (pp, p, mp, mf, f, ff)
- [ ] Multi-line percussion (hi-hat, snare, kick)
- [ ] MIDI export
- [ ] PDF export
- [ ] Share/embed generated patterns
- [ ] User accounts and pattern library
- [ ] Mobile app

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT License - feel free to use this project for learning or commercial purposes.

## Acknowledgments

- **OpenSheetMusicDisplay** - Sheet music rendering library
- **Anthropic** - Claude 4.5 Sonnet API
- **MusicXML** - Industry-standard music notation format
- Inspired by the need for better drumming practice resources

## Contact

Created by Viraaj Singh

---

**Note:** This project demonstrates the power of few-shot learning with modern LLMs. By using structured outputs and intelligent example selection, we achieve better generalization than fine-tuning while maintaining speed and cost-effectiveness.
