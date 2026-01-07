# Drum AI Copilot - MuseScore Plugin

A natural language copilot for snare drum composition in MuseScore. Generate drum patterns using AI with simple commands like "Generate paradiddles from measures 4-8".

## Features

- 🎵 **Natural Language Generation**: Type what you want in plain English
- 🥁 **Snare Drum Focus**: Specialized for rudimental snare drumming
- ⚡ **Powered by Claude 4.5 Sonnet**: Advanced AI understanding of drum patterns
- 🎼 **Direct MuseScore Integration**: Results appear instantly in your score
- ↩️ **Fully Undoable**: All changes support Ctrl+Z/Cmd+Z
- 🔒 **Your API Key**: You control your own API usage and costs

## Supported Patterns

- **Basic Rudiments**: Single strokes, paradiddles, diddles
- **Tuplets**: Triplets, fivelets (quintuplets), sevenlets (septuplets)
- **Embellishments**: Accents, flams, ghost notes
- **Mixed Patterns**: Any combination of the above
- **Custom Time Signatures**: 4/4, 3/4, 6/8, and more

## Installation

### Step 1: Download the Plugin

Download [drum-ai-copilot.qml](drum-ai-copilot.qml) to your computer.

### Step 2: Install in MuseScore

Copy the file to your MuseScore plugins folder:

**macOS:**
```bash
~/Library/Application Support/MuseScore/MuseScore3/plugins/
```

**Windows:**
```
%APPDATA%\MuseScore\MuseScore3\plugins\
```

**Linux:**
```bash
~/.local/share/MuseScore/MuseScore3/plugins/
```

### Step 3: Enable the Plugin

1. Restart MuseScore
2. Go to **Plugins → Plugin Manager**
3. Check the box next to **"Drum AI Copilot"**
4. Click **OK**

### Step 4: Get Your API Key

1. Go to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **API Keys**
4. Create a new API key
5. Copy the key (starts with `sk-ant-...`)

**Important**: Keep your API key secure and never share it publicly.

## Usage

### First Time Setup

1. Open a score in MuseScore
2. Go to **Plugins → Drum AI Copilot**
3. Paste your Anthropic API key in the "API Key" field
4. Click "Test" to verify it works
5. You're ready to generate!

### Basic Commands

The plugin accepts natural language commands. Here are some examples:

#### Simple Generation
```
Generate one measure of 16th note single strokes
```
Generates 1 measure with alternating R L R L... sticking at 16th note speed.

#### Multiple Measures
```
Create 4 measures of paradiddles
```
Generates the classic RLRR LRLL pattern for 4 measures.

#### Measure Ranges
```
Generate paradiddles from measures 4-8
```
Inserts 5 measures (4 through 8) of paradiddles at those specific locations.

#### Triplets
```
Create triplet single strokes for 2 measures
```
Generates eighth note triplets with alternating sticking.

#### Fivelets (Quintuplets)
```
Generate eighth note fivelets
```
Creates groups of 5 notes in the space of 2 for added complexity.

#### Sevenlets (Septuplets)
```
Create 16th note sevenlets for one measure
```
Generates groups of 7 notes in the space of 2.

#### With Accents
```
Generate 16th note single strokes with accents on beats 1 and 3
```
Creates the pattern with accent markings on specified beats.

#### Mixed Patterns
```
Create a groove with paradiddles and triplets
```
The AI will interpret and create an interesting combination.

## Command Structure

### Keywords for Generation

- **Generate**: Start pattern from scratch
- **Create**: Same as generate
- **Write**: Alternative to generate
- **Compose**: Create artistic patterns

### Specifying Measures

- `measure X` - Single measure
- `measures X-Y` - Range of measures
- `from measures X to Y` - Alternative syntax
- `for N measures` - Number of measures

### Pattern Types

Common patterns the AI understands:
- Single strokes
- Paradiddles
- Double strokes / Diddles
- Flams
- Triplets
- Fivelets / Quintuplets
- Sevenlets / Septuplets
- Rolls
- Accents

## How It Works

1. You type a natural language command
2. Plugin sends it to the Drum AI backend (powered by Claude 4.5 Sonnet)
3. AI generates drum notation in a specialized JSON format
4. Plugin converts JSON to MuseScore API calls
5. Notes appear instantly in your score

**Architecture:**
```
MuseScore Plugin (QML)
    ↓ HTTPS
Drum AI Backend (Vercel)
    ↓ Claude API
AI Generation
    ↓ AWS Lambda
MusicXML Compilation
    ↓
Back to Plugin
```

## Tips & Best Practices

### Be Specific
✅ "Generate 16th note paradiddles for 4 measures"
❌ "Make some drum stuff"

### Specify Duration
✅ "Create eighth note single strokes"
❌ "Create single strokes" (defaults to quarter notes)

### Use Measure Numbers
✅ "Generate triplets from measures 10-15"
❌ "Put triplets somewhere in the middle"

### Combine Techniques
✅ "Generate paradiddles with accents on beats 1 and 3 for measures 5-8"

### Start Simple
Begin with basic patterns to understand how the AI interprets commands, then get more creative!

## Troubleshooting

### "Please enter your API key first"
- You haven't configured your Anthropic API key
- Enter it in the API Key field at the bottom of the dialog
- Click "Test" to verify it works

### "Invalid API key - please check your settings"
- The API key you entered is incorrect or expired
- Get a new key from [https://console.anthropic.com/](https://console.anthropic.com/)
- Make sure you copied the full key (starts with `sk-ant-`)

### "Network error - could not reach backend"
- Check your internet connection
- The backend might be temporarily down
- Try again in a few moments

### "Backend error (HTTP 500)"
- The AI service encountered an error
- Try simplifying your command
- Check the MuseScore console for detailed error messages

### Plugin doesn't appear in menu
- Make sure you copied the file to the correct plugins folder
- Restart MuseScore completely
- Enable the plugin in Plugins → Plugin Manager

### Notes appear in wrong location
- Specify measure numbers in your command
- Example: "from measures 4-8"
- By default, notes insert at the cursor position or measure 1

### Wrong note durations
- Be explicit about note values: "16th note", "eighth note", "quarter note"
- For tuplets, say "triplets", "fivelets", or "sevenlets"

## API Costs

The plugin uses Claude 4.5 Sonnet, which costs approximately:
- **$0.002 - $0.01 per generation** (typically 1-4 measures)
- **~$0.20 - $1.00 per 100 generations**

You control costs by using your own API key. Check usage at [https://console.anthropic.com/](https://console.anthropic.com/)

## Limitations (v1.0)

- **Snare drum only**: Multi-instrument support coming in future versions
- **No local modifications yet**: Commands like "add accents to measure 5" will be added in Phase 3
- **MuseScore 3.x optimized**: Works on MuseScore 4.x but tested primarily on 3.x
- **Online only**: Requires internet connection for AI generation

## Privacy & Security

- Your API key is stored locally on your computer only
- Commands are sent to the Drum AI backend via HTTPS
- The backend forwards requests to Claude API
- No data is stored or logged permanently
- Your compositions remain completely private

## Examples Gallery

### Example 1: Basic Single Strokes
**Command:** "Generate one measure of 16th note single strokes"

**Result:** 16 notes with alternating R L sticking

### Example 2: Paradiddles
**Command:** "Create paradiddles from measures 4-8"

**Result:** RLRR LRLL RLRR LRLL pattern across 5 measures

### Example 3: Triplet Groove
**Command:** "Generate eighth note triplets with accents on the first note of each group"

**Result:** Triplet pattern with accent markings

### Example 4: Mixed Duration
**Command:** "Create a groove with quarter notes and 16th note fills"

**Result:** Musical phrase with dynamic rhythm changes

### Example 5: Advanced Tuplets
**Command:** "Generate 2 measures of eighth note fivelets"

**Result:** Quintuplet groups (5 notes per beat) for 2 measures

## Keyboard Shortcuts

Currently, the plugin must be launched from the menu. Future versions may support custom keyboard shortcuts via MuseScore preferences.

**To launch:**
- **Menu:** Plugins → Drum AI Copilot
- **Future:** Assign custom shortcut in Edit → Preferences → Shortcuts

## Support & Feedback

Found a bug? Have a feature request?

- **Issues:** Open an issue on GitHub
- **Questions:** Check the examples above first
- **Ideas:** We'd love to hear your suggestions!

## Roadmap

### Phase 2: Context Awareness (Coming Soon)
- ✅ Parse measure ranges
- ✅ Navigate to specific measures
- ✅ Better handling of existing content

### Phase 3: Local Modifications (Planned)
- Add accents without backend call
- Modify sticking patterns
- Adjust dynamics locally
- Faster operations

### Phase 4: Polish (Planned)
- Persistent settings
- Command history
- Better error messages
- Comprehensive documentation

### Future Enhancements
- Multi-instrument support (bass, tenors, cymbals)
- Dock panel UI (always visible)
- Visual pattern picker
- Custom pattern library
- Tempo-aware practice loops

## Credits

**Created by:** Viraaj Singh

**Powered by:**
- Claude 4.5 Sonnet (Anthropic)
- MuseScore Plugin API
- AWS Lambda (MusicXML compilation)

## License

[Add your license here]

## Version History

### v1.0.0 (Current)
- Initial release
- Natural language drum pattern generation
- Snare drum support
- Basic rudiments (singles, paradiddles)
- Tuplet support (triplets, fivelets, sevenlets)
- Embellishments (accents, flams, ghost notes)
- Direct MuseScore integration

---

**Happy drumming! 🥁**
