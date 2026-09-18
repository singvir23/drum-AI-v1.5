import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import MuseScore 3.0
import FileIO 3.0

// Drum AI Copilot — natural-language snare notation inside MuseScore 4.6+.
//
// Flow: read the score (time signature, measures as compact tokens, selection)
//       → POST to the backend → the model answers with { startMeasure, measures }
//       → clear the target measures → pass 1 writes notes/rests/tuplets
//       → pass 2 adds sticking, accents, diddles, ghost notes, flams.
// Everything happens inside one startCmd()/endCmd(), so Cmd+Z undoes a whole generation.

MuseScore {
    id: plugin
    version: "2.0.0"
    title: "Drum AI Copilot"
    description: "Generate and edit snare drum notation from natural language."
    categoryCode: "composing-arranging-tools"
    pluginType: "dialog"
    requiresScore: true

    width: 600
    height: 560
    implicitWidth: 600
    implicitHeight: 560

    // ---------------------------------------------------------------------------------------
    // Settings (persisted to ~/.drum-ai-copilot.json)
    // ---------------------------------------------------------------------------------------

    property string apiKey: ""
    property string backendUrl: "https://drum-ai-backend.vercel.app"
    readonly property string defaultBackendUrl: "https://drum-ai-backend.vercel.app"

    FileIO {
        id: settingsFile
        onError: console.log("[drum-ai] settings file error: " + msg)
    }

    function loadSettings() {
        settingsFile.source = settingsFile.homePath() + "/.drum-ai-copilot.json"
        if (!settingsFile.exists()) return
        try {
            var s = JSON.parse(settingsFile.read())
            if (typeof s.apiKey === "string") apiKey = s.apiKey
            if (typeof s.backendUrl === "string" && s.backendUrl.trim() !== "") backendUrl = s.backendUrl.trim()
        } catch (e) {
            log("Could not read settings: " + e)
        }
    }

    function saveSettings() {
        try {
            settingsFile.write(JSON.stringify({ apiKey: apiKey, backendUrl: backendUrl }))
        } catch (e) {
            log("Could not save settings: " + e)
        }
    }

    // ---------------------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------------------

    property bool isLoading: false
    property string logText: ""
    property string targetText: ""
    property var currentRequest: null
    readonly property bool versionOk: mscoreMajorVersion > 4 || (mscoreMajorVersion === 4 && mscoreMinorVersion >= 6)
    readonly property int snarePitch: 38   // General MIDI acoustic snare

    readonly property var examplePrompts: [
        "4 measures of 16th note paradiddles",
        "one measure of 16th note singles with an accent every 4 notes",
        "2 measures of eighth note triplets, accent the first of each group",
        "a measure of eighth note quintuplets",
        "make these paradiddles",
        "add flams to the first note of each beat",
        "add accents on beats 1 and 3",
        "remove all the accents",
        "reverse the sticking in this measure",
        "a measure of five stroke rolls",
        "8th note singles with ghost notes on the upbeats",
        "make beats 1 and 2 of measure 2 sixteenth note triplets"
    ]

    onRun: {
        loadSettings()
        if (!versionOk) {
            log("MuseScore " + mscoreMajorVersion + "." + mscoreMinorVersion + " detected; 4.6 or newer is recommended.")
        }
        refreshTarget()
        showStatus(apiKey.trim() === "" ? "Open Settings and paste your Anthropic API key to start." : "Ready.", "info")
        promptInput.forceActiveFocus()
    }

    onScoreStateChanged: {
        if (state.selectionChanged) refreshTarget()
    }

    // ---------------------------------------------------------------------------------------
    // UI
    // ---------------------------------------------------------------------------------------

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 16
        spacing: 10

        RowLayout {
            Layout.fillWidth: true
            Label {
                text: "Drum AI Copilot"
                font.bold: true
                font.pixelSize: 17
            }
            Label {
                text: "v" + plugin.version
                opacity: 0.6
                font.pixelSize: 11
            }
            Item { Layout.fillWidth: true }
            Button {
                id: settingsToggle
                text: settingsPane.visible ? "Hide settings" : "Settings"
                flat: true
                onClicked: settingsPane.visible = !settingsPane.visible
            }
        }

        // Settings pane -----------------------------------------------------------------
        Frame {
            id: settingsPane
            Layout.fillWidth: true
            visible: apiKey.trim() === ""

            GridLayout {
                anchors.fill: parent
                columns: 2
                columnSpacing: 10
                rowSpacing: 8

                Label { text: "Anthropic API key" }
                TextField {
                    id: apiKeyInput
                    Layout.fillWidth: true
                    text: apiKey
                    echoMode: TextInput.Password
                    placeholderText: "sk-ant-…  (stored in ~/.drum-ai-copilot.json)"
                    onEditingFinished: {
                        var v = text.trim()
                        if (v !== apiKey) { apiKey = v; saveSettings(); showStatus(v ? "API key saved." : "API key cleared.", "info") }
                    }
                }

                Label { text: "Backend URL" }
                RowLayout {
                    Layout.fillWidth: true
                    TextField {
                        id: backendInput
                        Layout.fillWidth: true
                        text: backendUrl
                        placeholderText: defaultBackendUrl
                        onEditingFinished: {
                            var v = text.trim().replace(/\/+$/, "")
                            if (v === "") v = defaultBackendUrl
                            if (v !== backendUrl) { backendUrl = v; saveSettings(); showStatus("Backend URL saved.", "info") }
                        }
                    }
                    Button {
                        text: "Test"
                        enabled: !isLoading
                        onClicked: testBackend()
                    }
                }
            }
        }

        // Prompt ------------------------------------------------------------------------
        Frame {
            Layout.fillWidth: true
            Layout.preferredHeight: 92
            padding: 0

            ScrollView {
                anchors.fill: parent
                clip: true

                TextArea {
                    id: promptInput
                    placeholderText: "What should I write? e.g. \"4 measures of paradiddles with an accent on beat 1\"\nEnter to generate · Shift+Enter for a new line"
                    wrapMode: TextEdit.Wrap
                    selectByMouse: true
                    enabled: !isLoading
                    Keys.onReturnPressed: function(event) {
                        if (event.modifiers & Qt.ShiftModifier) { event.accepted = false; return }
                        event.accepted = true
                        generate()
                    }
                    Keys.onEnterPressed: function(event) {
                        event.accepted = true
                        generate()
                    }
                }
            }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 10

            Label {
                id: targetLabel
                text: targetText
                opacity: 0.75
                font.pixelSize: 12
                elide: Text.ElideRight
                Layout.fillWidth: true
            }

            ComboBox {
                id: exampleBox
                Layout.preferredWidth: 150
                displayText: "Examples…"
                model: examplePrompts
                enabled: !isLoading
                onActivated: function(index) {
                    promptInput.text = examplePrompts[index]
                    promptInput.forceActiveFocus()
                    promptInput.cursorPosition = promptInput.text.length
                }
            }
        }

        // Actions -----------------------------------------------------------------------
        RowLayout {
            Layout.fillWidth: true
            spacing: 10

            Label {
                id: statusLabel
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
                font.pixelSize: 12
                text: ""
            }

            BusyIndicator {
                running: isLoading
                visible: isLoading
                Layout.preferredWidth: 26
                Layout.preferredHeight: 26
            }

            Button {
                text: isLoading ? "Cancel" : "Close"
                onClicked: isLoading ? cancelRequest() : quit()
            }

            Button {
                id: generateButton
                text: "Generate"
                highlighted: true
                enabled: !isLoading && promptInput.text.trim() !== ""
                onClicked: generate()
            }
        }

        Label {
            id: summaryLabel
            Layout.fillWidth: true
            wrapMode: Text.WordWrap
            visible: text !== ""
            font.pixelSize: 12
        }

        Label {
            id: warningLabel
            Layout.fillWidth: true
            wrapMode: Text.WordWrap
            visible: text !== ""
            color: "#c77700"
            font.pixelSize: 11
        }

        // Log ---------------------------------------------------------------------------
        CheckBox {
            id: showLog
            text: "Show details"
            checked: false
            font.pixelSize: 11
        }

        Frame {
            Layout.fillWidth: true
            Layout.fillHeight: true
            visible: showLog.checked
            padding: 0

            ScrollView {
                anchors.fill: parent
                clip: true
                TextArea {
                    id: logArea
                    text: logText
                    readOnly: true
                    wrapMode: TextEdit.Wrap
                    font.family: "Menlo, Courier, monospace"
                    font.pixelSize: 10
                    selectByMouse: true
                }
            }
        }

        Item { Layout.fillHeight: !showLog.checked }
    }

    // ---------------------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------------------

    function log(message) {
        var line = "[" + Qt.formatTime(new Date(), "hh:mm:ss") + "] " + message
        console.log("[drum-ai] " + message)
        logText += line + "\n"
        if (logText.length > 60000) logText = logText.slice(logText.length - 40000)
    }

    function showStatus(message, kind) {
        statusLabel.text = message
        statusLabel.color = kind === "error" ? "#c62828"
                          : kind === "success" ? "#2e7d32"
                          : kind === "loading" ? "#1565c0"
                          : statusLabel.palette.windowText
    }

    function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s") }

    // ---------------------------------------------------------------------------------------
    // Reading the score
    // ---------------------------------------------------------------------------------------

    /** Table of measures: [{ measure, startTick, endTick }] in score order (index 0 = measure 1). */
    function measureTable() {
        var table = []
        var m = curScore ? curScore.firstMeasure : null
        var guard = 0
        while (m && guard++ < 10000) {
            table.push({ measure: m, startTick: m.firstSegment.tick, endTick: measureEndTick(m) })
            m = m.nextMeasure
        }
        return table
    }

    function measureEndTick(m) {
        var end = m.lastSegment ? m.lastSegment.tick : -1
        if (end > m.firstSegment.tick) return end
        var ts = timeSignatureOf(m)
        return m.firstSegment.tick + Math.round(ts.num * 4 * division / ts.den)
    }

    function timeSignatureOf(m) {
        try {
            var ts = m.timesigActual
            if (ts && ts.numerator > 0 && ts.denominator > 0) return { num: ts.numerator, den: ts.denominator }
        } catch (e) { /* fall through */ }
        return { num: 4, den: 4 }
    }

    /** Measure index (0-based) containing a tick, or -1. */
    function measureIndexAtTick(table, tick) {
        for (var i = 0; i < table.length; i++) {
            if (tick >= table[i].startTick && tick < table[i].endTick) return i
        }
        return -1
    }

    /** Current range selection as { start, end } (1-based, inclusive) or null. */
    function selectedMeasureRange(table) {
        try {
            var sel = curScore.selection
            if (!sel || !sel.isRange || !sel.startSegment) return null
            var startIdx = measureIndexAtTick(table, sel.startSegment.tick)
            if (startIdx < 0) return null
            var endIdx = table.length - 1
            if (sel.endSegment) {
                var e = measureIndexAtTick(table, sel.endSegment.tick - 1)
                if (e >= 0) endIdx = e
            }
            if (endIdx < startIdx) endIdx = startIdx
            return { start: startIdx + 1, end: endIdx + 1 }
        } catch (e) {
            log("Selection could not be read: " + e)
            return null
        }
    }

    function refreshTarget() {
        if (!curScore) { targetText = ""; return }
        var table = measureTable()
        var sel = selectedMeasureRange(table)
        if (sel) {
            targetText = sel.start === sel.end ? "Target: measure " + sel.start + " (selected)"
                                               : "Target: measures " + sel.start + "–" + sel.end + " (selected)"
        } else {
            targetText = "Target: chosen from your prompt · " + plural(table.length, "measure") + " in score"
        }
    }

    /** Duration code ("E", "E3", …) for a chord/rest, or "?" if it can't be expressed. */
    function durationCodeOf(cr) {
        var d = cr.duration
        if (!d) return "?"
        var base = null
        if (d.numerator === 1) {
            base = { 1: "W", 2: "H", 4: "Q", 8: "E", 16: "S", 32: "T" }[d.denominator] || null
        }
        if (!base) return "?"
        var tup = cr.tuplet
        if (tup) {
            var n = tup.actualNotes
            var normal = tup.normalNotes
            if ((n !== 3 && n !== 5 && n !== 7) || normal !== 2 || (base !== "Q" && base !== "E" && base !== "S")) return "?"
            if (tup.tuplet) return "?"   // nested tuplets
            return base + n
        }
        return base
    }

    function isAccent(artic) {
        try {
            var s = artic.symbol
            if (s == SymId.articAccentAbove || s == SymId.articAccentBelow) return true
            var name = ("" + artic.subtypeName()).toLowerCase()
            return name.indexOf("accent") >= 0 && name.indexOf("marcato") < 0
        } catch (e) { return false }
    }

    /** Serialize one measure (track 0) to compact tokens. "" = only rests. */
    function serializeMeasure(entry) {
        var tokens = []
        var hasNotes = false
        var cursor = curScore.newCursor()
        cursor.staffIdx = 0
        cursor.voice = 0
        cursor.rewindToTick(entry.startTick)

        var guard = 0
        while (cursor.segment && cursor.segment.tick < entry.endTick && guard++ < 2000) {
            var el = cursor.element
            if (el) {
                var code = durationCodeOf(el)
                if (el.type === Element.REST) {
                    tokens.push(code === "?" ? "?" : code + "R")
                } else if (el.type === Element.CHORD) {
                    hasNotes = true
                    if (code === "?") {
                        tokens.push("?")
                    } else {
                        var hand = ""
                        try {
                            if (el.lyrics && el.lyrics.length > 0) {
                                var t = ("" + el.lyrics[0].text).trim().toUpperCase()
                                if (t === "R" || t === "L") hand = t
                            }
                        } catch (e) { /* no lyrics */ }
                        var emb = ""
                        try {
                            for (var a = 0; a < el.articulations.length; a++) if (isAccent(el.articulations[a])) { emb += "X"; break }
                        } catch (e) { /* no articulations */ }
                        try { if (el.graceNotesBefore && el.graceNotesBefore.length > 0) emb += "F" } catch (e) { /* ignore */ }
                        try { if (el.tremoloSingleChord || el.tremoloTwoChord) emb += "D" } catch (e) { /* ignore */ }
                        try { if (el.notes && el.notes.length > 0 && el.notes[0].hasParentheses) emb += "G" } catch (e) { /* ignore */ }
                        tokens.push(hand + code + emb)
                    }
                }
            }
            if (!cursor.next()) break
        }
        return hasNotes ? tokens.join(" ") : ""
    }

    /** Build the score context sent to the backend. */
    function readScoreContext() {
        var table = measureTable()
        var ts = table.length > 0 ? timeSignatureOf(table[0].measure) : { num: 4, den: 4 }
        var selection = selectedMeasureRange(table)

        // Send every measure up to a cap; beyond that, a window around the selection.
        var CAP = 64
        var first = 0
        var last = table.length - 1
        if (table.length > CAP) {
            var center = selection ? selection.start - 1 : last
            first = Math.max(0, Math.min(center - 8, table.length - CAP))
            last = Math.min(table.length - 1, first + CAP - 1)
        }
        var measures = []
        for (var i = first; i <= last; i++) measures.push(serializeMeasure(table[i]))

        return {
            timeSignature: ts.num + "/" + ts.den,
            measureCount: table.length,
            selection: selection,
            measures: measures,
            firstListedMeasure: first + 1
        }
    }

    // ---------------------------------------------------------------------------------------
    // Backend
    // ---------------------------------------------------------------------------------------

    Timer {
        id: watchdog
        interval: 90000
        repeat: false
        onTriggered: {
            if (currentRequest) {
                log("Request timed out after 90 s")
                var r = currentRequest
                currentRequest = null
                try { r.abort() } catch (e) { /* ignore */ }
                finishRequest()
                showStatus("The backend did not answer within 90 seconds. Try again or ask for fewer measures.", "error")
            }
        }
    }

    function cancelRequest() {
        if (!currentRequest) return
        var r = currentRequest
        currentRequest = null
        try { r.abort() } catch (e) { /* ignore */ }
        watchdog.stop()
        finishRequest()
        showStatus("Cancelled.", "info")
        log("Request cancelled")
    }

    function finishRequest() {
        isLoading = false
        promptInput.forceActiveFocus()
    }

    function postJson(path, body, onDone) {
        var xhr = new XMLHttpRequest()
        currentRequest = xhr
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== XMLHttpRequest.DONE) return
            if (currentRequest !== xhr) return   // cancelled or timed out
            currentRequest = null
            watchdog.stop()
            var parsed = null
            try { parsed = xhr.responseText ? JSON.parse(xhr.responseText) : null } catch (e) { parsed = null }
            if (xhr.status === 200 && parsed) {
                onDone(null, parsed)
            } else if (xhr.status === 0) {
                onDone("Could not reach " + backendUrl + ". Check your internet connection and the backend URL in Settings.", null)
            } else if (parsed && parsed.error) {
                onDone(parsed.error + " (HTTP " + xhr.status + ")", null)
            } else {
                onDone("Backend error (HTTP " + xhr.status + ")", null)
            }
        }
        try {
            xhr.open("POST", backendUrl + path, true)
            xhr.setRequestHeader("Content-Type", "application/json")
            xhr.send(JSON.stringify(body))
            watchdog.restart()
        } catch (e) {
            currentRequest = null
            onDone("Failed to send request: " + e, null)
        }
    }

    function testBackend() {
        isLoading = true
        showStatus("Checking " + backendUrl + " …", "loading")
        var xhr = new XMLHttpRequest()
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== XMLHttpRequest.DONE) return
            isLoading = false
            if (xhr.status === 200) {
                try {
                    var info = JSON.parse(xhr.responseText)
                    showStatus("Backend OK — v" + info.version + ", model " + info.model, "success")
                } catch (e) {
                    showStatus("Backend answered but not with the expected JSON.", "error")
                }
            } else if (xhr.status === 0) {
                showStatus("Could not reach " + backendUrl, "error")
            } else {
                showStatus("Backend returned HTTP " + xhr.status, "error")
            }
        }
        try {
            xhr.open("GET", backendUrl + "/", true)
            xhr.send()
        } catch (e) {
            isLoading = false
            showStatus("Failed to contact backend: " + e, "error")
        }
    }

    // ---------------------------------------------------------------------------------------
    // Generate
    // ---------------------------------------------------------------------------------------

    function generate() {
        if (isLoading) return
        var prompt = promptInput.text.trim()
        if (prompt === "") return
        if (!curScore) { showStatus("Open a score first.", "error"); return }
        if (apiKey.trim() === "") {
            settingsPane.visible = true
            showStatus("Paste your Anthropic API key in Settings first.", "error")
            return
        }

        summaryLabel.text = ""
        warningLabel.text = ""
        var score
        try {
            score = readScoreContext()
        } catch (e) {
            showStatus("Could not read the score: " + e, "error")
            log("readScoreContext failed: " + e)
            return
        }
        log("Prompt: " + prompt)
        log("Score: " + score.timeSignature + ", " + score.measureCount + " measures, selection " + JSON.stringify(score.selection))

        isLoading = true
        showStatus("Thinking…", "loading")

        postJson("/generate", { prompt: prompt, apiKey: apiKey, score: score }, function(error, result) {
            finishRequest()
            if (error) {
                showStatus(error, "error")
                log("Backend error: " + error)
                return
            }
            if (!result || !Array.isArray(result.measures) || result.measures.length === 0 || !(result.startMeasure >= 1)) {
                showStatus("The backend returned an unexpected response.", "error")
                log("Bad response: " + JSON.stringify(result).slice(0, 500))
                return
            }
            log("Backend: start=" + result.startMeasure + " measures=" + result.measures.length +
                (result.repairedByModel ? " (model self-corrected)" : ""))
            for (var i = 0; i < result.measures.length; i++) log("  " + (result.startMeasure + i) + ": " + result.measures[i])

            showStatus("Writing " + plural(result.measures.length, "measure") + "…", "loading")
            var outcome = applyResult(result.startMeasure, result.measures)
            var warnings = (result.warnings || []).concat(outcome.warnings)

            if (outcome.ok) {
                var lastM = result.startMeasure + result.measures.length - 1
                var where = result.measures.length === 1 ? "measure " + result.startMeasure : "measures " + result.startMeasure + "–" + lastM
                showStatus("Done — wrote " + where + ". Cmd+Z / Ctrl+Z undoes it.", "success")
                summaryLabel.text = result.summary || ""
            } else {
                showStatus("Failed while writing to the score: " + outcome.error, "error")
            }
            warningLabel.text = warnings.length ? "⚠ " + warnings.join("\n⚠ ") : ""
            refreshTarget()
        })
    }

    // ---------------------------------------------------------------------------------------
    // Writing to the score
    // ---------------------------------------------------------------------------------------

    readonly property var baseDenominators: ({ "W": 1, "H": 2, "Q": 4, "E": 8, "S": 16, "T": 32 })

    /** Parse a token string into { hand, base, tuplet, rest, emb } or null. */
    function parseToken(text) {
        var m = /^([RL])?([WHQEST])([357])?(R)?([XFDG]*)$/.exec(text.toUpperCase())
        if (!m) return null
        return { hand: m[1] || null, base: m[2], tuplet: m[3] ? parseInt(m[3]) : null, rest: !!m[4], emb: m[5] || "", text: text }
    }

    function parseMeasureTokens(str) {
        var out = []
        var parts = ("" + str).trim().split(/\s+/)
        for (var i = 0; i < parts.length; i++) {
            if (parts[i] === "") continue
            var t = parseToken(parts[i])
            if (!t) throw new Error("unknown token \"" + parts[i] + "\"")
            out.push(t)
        }
        return out
    }

    /**
     * Replace measures startMeasure .. startMeasure+n-1 with the given measure strings.
     * Returns { ok, error, warnings }.
     */
    function applyResult(startMeasure, measureStrings) {
        var warnings = []
        var parsed = []
        try {
            for (var i = 0; i < measureStrings.length; i++) parsed.push(parseMeasureTokens(measureStrings[i]))
        } catch (e) {
            return { ok: false, error: "" + e, warnings: warnings }
        }

        curScore.startCmd()
        var committed = false
        try {
            // 1. Make sure the measures exist.
            var table = measureTable()
            var needed = startMeasure + measureStrings.length - 1
            if (needed > table.length) {
                var extra = needed - table.length
                log("Appending " + plural(extra, "measure"))
                curScore.appendMeasures(extra)
                table = measureTable()
                if (needed > table.length) throw new Error("could not append measures")
            }

            var firstEntry = table[startMeasure - 1]
            var lastEntry = table[needed - 1]

            // 2. Clear the target range (leaves full-measure rests).
            if (!curScore.selection.selectRange(firstEntry.startTick, lastEntry.endTick, 0, 1)) {
                throw new Error("could not select measures " + startMeasure + "–" + needed)
            }
            cmd("delete")
            curScore.selection.clear()

            // 3. Pass 1: notes, rests and tuplets.
            for (var m = 0; m < parsed.length; m++) {
                writeMeasureNotes(table[startMeasure - 1 + m], parsed[m])
            }

            // 4. Pass 2: sticking and embellishments.
            for (var d = 0; d < parsed.length; d++) {
                var w = decorateMeasure(table[startMeasure - 1 + d], parsed[d], startMeasure + d)
                warnings = warnings.concat(w)
            }

            curScore.selection.clear()
            curScore.endCmd()
            committed = true
            return { ok: true, error: null, warnings: warnings }
        } catch (e) {
            log("applyResult failed: " + e)
            if (!committed) {
                try { curScore.endCmd(true) } catch (e2) { /* ignore */ }
            }
            return { ok: false, error: "" + e, warnings: warnings }
        }
    }

    /** Pass 1 for one measure. Tokens are grouped into tuplets by runs of the same code. */
    function writeMeasureNotes(entry, tokens) {
        if (tokens.length === 0) return   // "" = leave the whole-measure rest

        var cursor = curScore.newCursor()
        cursor.staffIdx = 0
        cursor.voice = 0
        cursor.rewindToTick(entry.startTick)

        var i = 0
        while (i < tokens.length) {
            var t = tokens[i]
            var den = baseDenominators[t.base]
            if (!t.tuplet) {
                cursor.setDuration(1, den)
                if (t.rest) cursor.addRest(); else cursor.addNote(snarePitch)
                i++
                continue
            }
            // Collect one tuplet group of N tokens with the same code.
            var n = t.tuplet
            var group = []
            while (group.length < n && i < tokens.length && tokens[i].base === t.base && tokens[i].tuplet === n) {
                group.push(tokens[i]); i++
            }
            if (group.length !== n) {
                // Backend validation guarantees complete groups; degrade gracefully anyway.
                log("Incomplete " + t.base + n + " group (" + group.length + "/" + n + "); writing as plain notes")
                for (var g = 0; g < group.length; g++) {
                    cursor.setDuration(1, den)
                    if (group[g].rest) cursor.addRest(); else cursor.addNote(snarePitch)
                }
                continue
            }
            cursor.addTuplet(fraction(n, 2), fraction(2, den))
            cursor.setDuration(1, den)
            for (var k = 0; k < group.length; k++) {
                if (group[k].rest) cursor.addRest(); else cursor.addNote(snarePitch)
            }
        }
    }

    /** Pass 2 for one measure: walk the chords just written and decorate them. */
    function decorateMeasure(entry, tokens, measureNumber) {
        var warnings = []
        if (tokens.length === 0) return warnings

        var cursor = curScore.newCursor()
        cursor.staffIdx = 0
        cursor.voice = 0
        cursor.rewindToTick(entry.startTick)

        var idx = 0
        var guard = 0
        while (cursor.segment && cursor.segment.tick < entry.endTick && idx < tokens.length && guard++ < 2000) {
            var el = cursor.element
            if (el && (el.type === Element.CHORD || el.type === Element.REST)) {
                var t = tokens[idx]
                var isChord = el.type === Element.CHORD
                if (isChord === !t.rest) {
                    if (isChord) decorateChord(cursor, el, t)
                    idx++
                } else {
                    warnings.push("Measure " + measureNumber + ": written rhythm did not line up with the plan; some markings were skipped.")
                    log("Decoration mismatch in measure " + measureNumber + " at token " + idx + " (" + t.text + ")")
                    break
                }
            }
            if (!cursor.next()) break
        }
        if (idx < tokens.length && warnings.length === 0) {
            warnings.push("Measure " + measureNumber + ": only " + idx + " of " + tokens.length + " notes could be marked.")
        }
        return warnings
    }

    function decorateChord(cursor, chord, t) {
        // Sticking (lyric under the note)
        if (t.hand) {
            try {
                var lyric = newElement(Element.LYRICS)
                lyric.text = t.hand
                cursor.add(lyric)
            } catch (e) { log("sticking failed: " + e) }
        }
        if (t.emb.indexOf("X") >= 0) {
            try {
                var accent = newElement(Element.ARTICULATION)
                accent.symbol = SymId.articAccentAbove
                cursor.add(accent)
            } catch (e) { log("accent failed: " + e) }
        }
        if (t.emb.indexOf("D") >= 0) {
            try {
                var trem = newElement(Element.TREMOLO_SINGLECHORD)
                if (!trem) throw new Error("TREMOLO_SINGLECHORD unavailable")
                trem.tremoloType = t.base === "Q" || t.base === "H" || t.base === "W" ? TremoloType.R8
                                 : t.base === "E" ? TremoloType.R16
                                 : TremoloType.R32
                cursor.add(trem)
            } catch (e) { log("diddle failed: " + e) }
        }
        if (t.emb.indexOf("G") >= 0) {
            var done = false
            try {
                if (chord.notes && chord.notes.length > 0) { chord.notes[0].hasParentheses = true; done = true }
            } catch (e) { log("ghost via property failed: " + e) }
            if (!done) {
                try {
                    curScore.selection.select(chord.notes[0])
                    cmd("add-parentheses")
                } catch (e2) { log("ghost via command failed: " + e2) }
            }
        }
        if (t.emb.indexOf("F") >= 0) {
            try {
                curScore.selection.select(chord.notes[0])
                cmd("acciaccatura")
            } catch (e) { log("flam failed: " + e) }
        }
    }
}
