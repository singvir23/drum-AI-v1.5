# Drum AI Copilot - Testing Guide

This guide will help you test the plugin to ensure Phase 1 is working correctly.

## Prerequisites

1. **MuseScore 3.x** installed (preferably 3.6+)
2. **Anthropic API Key** from [https://console.anthropic.com/](https://console.anthropic.com/)
3. **Internet connection** for backend communication
4. **Backend deployed** at Vercel (or update `backendUrl` in plugin if different)

## Setup for Testing

### 1. Install the Plugin

```bash
# macOS
cp drum-ai-copilot.qml ~/Library/Application\ Support/MuseScore/MuseScore3/plugins/

# Linux
cp drum-ai-copilot.qml ~/.local/share/MuseScore/MuseScore3/plugins/

# Windows (PowerShell)
Copy-Item drum-ai-copilot.qml $env:APPDATA\MuseScore\MuseScore3\plugins\
```

### 2. Enable the Plugin

1. Open MuseScore
2. Go to **Plugins → Plugin Manager**
3. Find "Drum AI Copilot" in the list
4. Check the box to enable it
5. Click **OK**

### 3. Create a Test Score

1. Create a new score (File → New)
2. Choose "Choose Instruments"
3. Search for "Snare Drum" or select from Percussion
4. Create a score with 16 measures in 4/4 time
5. Save as "drum-test.mscz"

## Phase 1 Test Cases

### Test 1: Plugin Launch ✅

**Steps:**
1. With score open, click **Plugins → Drum AI Copilot**
2. Dialog should open

**Expected Result:**
- Dialog window appears
- Title: "Drum AI Copilot"
- Text input field visible
- API Key field visible
- Generate button present
- Status shows: "Please enter your API key"

**Pass/Fail:** ___________

---

### Test 2: API Key Configuration ✅

**Steps:**
1. Paste your Anthropic API key in the "API Key" field
2. Click "Test" button

**Expected Result:**
- Status changes to: "API key configured ✓" (green text)
- Generate button becomes enabled

**Pass/Fail:** ___________

---

### Test 3: Simple Generation - Single Strokes ✅

**Command:** `Generate one measure of 16th note single strokes`

**Steps:**
1. Type the command in the text field
2. Click "Generate" or press Enter
3. Wait for processing (loading spinner appears)

**Expected Result:**
- Loading spinner shows briefly
- Status changes to: "✓ Generated 1 measure successfully!" (green)
- Dialog closes automatically
- **Measure 1** now contains 16 sixteenth notes
- Notes alternate: R L R L R L... (sticking shown as lyrics)
- All notes are on the snare drum line
- Undo (Ctrl+Z / Cmd+Z) removes the generated notes

**Pass/Fail:** ___________

**Debug Info:**
- Check MuseScore Plugin Creator console for logs
- Look for "DEBUG:" prefixed messages
- Verify backend received request (check Vercel logs)

---

### Test 4: Paradiddles ✅

**Command:** `Create 2 measures of paradiddles`

**Steps:**
1. Clear the score or create a new one
2. Type the command
3. Click "Generate"

**Expected Result:**
- 2 measures generated
- Pattern: R L R R | L R L L | R L R R | L R L L
- Sticking matches paradiddle pattern
- Status: "✓ Generated 2 measures successfully!"

**Pass/Fail:** ___________

---

### Test 5: Triplets ✅

**Command:** `Generate triplet single strokes for one measure`

**Steps:**
1. Type the command
2. Click "Generate"

**Expected Result:**
- 1 measure with triplet groupings
- 12 notes total (4 beats × 3 notes per beat)
- Triplet brackets visible above note groups
- Alternating R L sticking

**Pass/Fail:** ___________

---

### Test 6: Fivelets (Quintuplets) ✅

**Command:** `Create eighth note fivelets`

**Steps:**
1. Type the command
2. Click "Generate"

**Expected Result:**
- 1 measure with fivelet groupings
- 20 notes total (4 beats × 5 notes per beat)
- Tuplet brackets showing "5:2" ratio
- Alternating sticking

**Pass/Fail:** ___________

---

### Test 7: Accents ✅

**Command:** `Generate 16th note single strokes with accents on beats 1 and 3`

**Steps:**
1. Type the command
2. Click "Generate"

**Expected Result:**
- 16 sixteenth notes
- Accent marks (>) on notes at beats 1 and 3
- Accent articulations visible in score

**Pass/Fail:** ___________

---

### Test 8: Error Handling - No API Key ❌

**Steps:**
1. Clear the API key field
2. Try to generate

**Expected Result:**
- Generate button is disabled
- Status shows: "Please enter your API key" (orange/warning color)
- Cannot click Generate

**Pass/Fail:** ___________

---

### Test 9: Error Handling - Invalid API Key ❌

**Steps:**
1. Enter a fake API key: `sk-ant-fake-key-123`
2. Try to generate a pattern

**Expected Result:**
- Loading spinner shows
- After backend response: "Error: Invalid API key - please check your settings" (red)
- No notes inserted

**Pass/Fail:** ___________

---

### Test 10: Error Handling - Network Offline ❌

**Steps:**
1. Disconnect from internet
2. Try to generate

**Expected Result:**
- Status shows: "Error: Network error - could not reach backend" (red)
- Graceful failure, no crash

**Pass/Fail:** ___________

---

## Visual Inspection Checklist

After a successful generation, verify:

- [ ] Notes appear on the correct staff line (snare drum)
- [ ] Sticking (R/L) appears as lyrics under notes
- [ ] Note durations are correct (sixteenths, eighths, etc.)
- [ ] Tuplet brackets appear for triplets/fivelets/sevenlets
- [ ] Accents render as ">" symbols above notes
- [ ] All notes are playable (select and play)
- [ ] Undo (Ctrl+Z) removes the generated content
- [ ] Redo (Ctrl+Shift+Z) brings it back

## Console Debugging

If tests fail, check the console output:

**MuseScore 3.x:**
1. Go to **Plugins → Plugin Creator** (Ctrl+Shift+P)
2. Load the plugin file
3. Click "Run"
4. Check the console output at the bottom

**Look for:**
- `DEBUG: Incoming prompt:` - Confirms backend received request
- `DEBUG: Claude response JSON:` - Shows AI output
- `DEBUG: Lambda response status:` - Shows compiler status
- `Starting note insertion at measure X` - Plugin processing
- Any ERROR or WARNING messages

## Backend Testing (Separate)

Test the backend independently:

```bash
curl -X POST https://drum-ai-backend.vercel.app/generate-xml \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Generate one measure of 16th note single strokes",
    "apiKey": "sk-ant-YOUR_API_KEY_HERE"
  }'
```

**Expected Response:**
```json
{
  "xml": "<?xml version='1.0'?>...",
  "notation": {
    "timeSignature": [4, 4],
    "measures": [...]
  }
}
```

## Common Issues & Solutions

### Issue: Plugin doesn't appear in menu
**Solution:**
- Verify file is in correct plugins folder
- Restart MuseScore completely
- Enable in Plugin Manager

### Issue: "Cannot read property 'startCmd' of undefined"
**Solution:**
- You must have a score open before running the plugin
- Create a new score first

### Issue: Notes appear but in wrong location
**Solution:**
- Currently Phase 1 inserts at measure 1 by default
- Phase 2 will add measure range navigation

### Issue: Tuplets don't render correctly
**Solution:**
- Check MuseScore version (3.6+ recommended)
- Verify the duration mapping in plugin code
- Check console for duration parsing errors

### Issue: Sticking lyrics don't appear
**Solution:**
- Check if lyrics are hidden (View → Show → Lyrics)
- Verify Element.LYRICS is supported in your MuseScore version

### Issue: Backend returns 500 error
**Solution:**
- Check Vercel deployment logs
- Verify AWS Lambda URL is configured
- Test Lambda function separately
- Check Claude API key is valid in backend .env

## Performance Benchmarks

Track these metrics during testing:

| Test | Expected Time | Actual Time | Notes |
|------|---------------|-------------|-------|
| Backend API call | 2-5 seconds | ______ | Network + AI + Lambda |
| Note insertion (1 measure) | < 100ms | ______ | MuseScore API |
| Note insertion (8 measures) | < 500ms | ______ | Should scale linearly |
| Dialog open/close | < 50ms | ______ | UI responsiveness |

## Success Criteria

Phase 1 is complete when:

- ✅ Plugin loads in MuseScore
- ✅ Dialog accepts text input
- ✅ Backend call succeeds with valid API key
- ✅ One measure of notes appears in score
- ✅ Multiple measures work correctly
- ✅ Tuplets (triplets, fivelets, sevenlets) render
- ✅ Embellishments (accents) appear
- ✅ Sticking (R/L) displays as lyrics
- ✅ Undo (Ctrl+Z) works
- ✅ Error handling is graceful

## Next Steps After Phase 1

Once all tests pass:

1. **Deploy backend changes** to Vercel (API key in request body)
2. **Share plugin** with beta testers
3. **Collect feedback** on command parsing
4. **Begin Phase 2** (measure range navigation)

## Reporting Issues

When reporting a bug, include:

1. **MuseScore version:** Help → About
2. **OS version:** macOS 13.x, Windows 11, etc.
3. **Command used:** Exact text typed
4. **Expected vs. Actual:** What should happen vs. what did happen
5. **Console output:** Copy from Plugin Creator console
6. **Backend logs:** If available from Vercel

---

**Last Updated:** 2026-01-06
**Plugin Version:** 1.0.0 (Phase 1)
