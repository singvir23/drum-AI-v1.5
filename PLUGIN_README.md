# Drum AI Copilot - MuseScore Plugin

Generate drum patterns using natural language commands directly in MuseScore.

## Quick Start

1. Copy `drum-ai-copilot.qml` to your MuseScore plugins folder
2. Restart MuseScore
3. Enable via Plugins → Plugin Manager
4. Open the plugin and enter your Anthropic API key
5. Type a command and generate!

## Example Commands

```
Generate one measure of 16th note single strokes
Create 4 measures of paradiddles
Generate triplet single strokes for 2 measures
Generate quintuplets for 1 measure
Create paradiddles from measures 4-8
Add accents to the first four measures
```

## Installation Paths

**macOS (MuseScore 4):**
```
~/Documents/MuseScore4/Plugins/drum-ai-copilot/
```

**Windows:**
```
%APPDATA%\MuseScore\MuseScore4\Plugins\
```

**Linux:**
```
~/.local/share/MuseScore/MuseScore4/Plugins/
```

## Supported Patterns

- Single strokes (16th, 8th, quarter notes)
- Paradiddles (RLRR LRLL)
- Triplets (3:2 ratio, 12 per measure)
- Quintuplets (5:2 ratio, 20 per measure)  
- Sevenlets (7:2 ratio, 28 per measure)
- Accents, flams, diddles, ghost notes

## API Key

Get your key from [console.anthropic.com](https://console.anthropic.com/)

Cost: ~$0.002-0.01 per generation

## Limitations

- Snare drum only (single staff line)
- Max 16 measures per request
- Requires internet connection

## Troubleshooting

**Plugin doesn't appear:**
- Restart MuseScore
- Check Plugin Manager is enabled

**"API key required" error:**
- Enter your Anthropic API key in the settings field

**Generation fails:**
- Check internet connection
- Verify API key is valid
- Try simpler commands

## Author

Viraaj Singh
