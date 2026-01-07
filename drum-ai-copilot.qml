import QtQuick 2.9
import QtQuick.Controls 2.2
import QtQuick.Layouts 1.3
import QtQuick.Window 2.2
import MuseScore 3.0

MuseScore {
    version: "1.2.0"
    description: "Generate drum patterns using AI - Natural language copilot for snare drum composition"
    title: "Drum AI Copilot"
    categoryCode: "composing-arranging-tools"
    requiresScore: true
    menuPath: "Plugins.Drum AI Copilot"

    // ========== SETTINGS ==========
    property string backendUrl: "https://drum-ai-backend.vercel.app"
    property string apiKey: ""
    property bool settingsConfigured: apiKey.trim() !== ""

    // ========== STATE ==========
    property bool isLoading: false
    property string lastError: ""
    property string debugLog: ""

    // ========== DURATION MAPPING ==========
    // Maps custom notation (W, H, Q, E, S, T, E3, E5, E7, etc.) to MuseScore duration fractions
    property var durationMap: ({
        // Basic durations
        "W": {num: 1, den: 1},      // Whole note
        "H": {num: 1, den: 2},      // Half note
        "Q": {num: 1, den: 4},      // Quarter note
        "E": {num: 1, den: 8},      // Eighth note
        "S": {num: 1, den: 16},     // Sixteenth note
        "T": {num: 1, den: 32},     // Thirty-second note

        // Triplets (3 notes in space of 2)
        "Q3": {num: 1, den: 6},     // Quarter triplet
        "E3": {num: 1, den: 12},    // Eighth triplet
        "S3": {num: 1, den: 24},    // Sixteenth triplet

        // Fivelets (5 notes in space of 2)
        "Q5": {num: 2, den: 20},    // Quarter fivelet
        "E5": {num: 2, den: 40},    // Eighth fivelet
        "S5": {num: 2, den: 80},    // Sixteenth fivelet

        // Sevenlets (7 notes in space of 2)
        "Q7": {num: 2, den: 28},    // Quarter sevenlet
        "E7": {num: 2, den: 56},    // Eighth sevenlet
        "S7": {num: 2, den: 112},   // Sixteenth sevenlet

        // Rests (same as notes, handled separately)
        "WR": {num: 1, den: 1},
        "HR": {num: 1, den: 2},
        "QR": {num: 1, den: 4},
        "ER": {num: 1, den: 8},
        "SR": {num: 1, den: 16},
        "TR": {num: 1, den: 32}
    })

    // ========== MAIN WINDOW ==========
    Window {
        id: mainWindow
        width: 700
        height: 600
        title: "Drum AI Copilot"
        modality: Qt.ApplicationModal
        flags: Qt.Dialog

        color: "#2d2d2d"

        Rectangle {
            anchors.fill: parent
            color: "#2d2d2d"

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 20
                spacing: 15

            // Header
            Label {
                text: "Drum AI Copilot"
                font.bold: true
                font.pixelSize: 16
                color: "#ffffff"
            }
            
            Label {
                text: "Enter a prompt to generate drum notation"
                font.pixelSize: 12
                color: "#888888"
            }

            // Input field
            TextField {
                id: promptInput
                Layout.fillWidth: true
                Layout.preferredHeight: 44
                placeholderText: "E.g., Generate paradiddles from measures 4-8"
                font.pixelSize: 13
                color: "#ffffff"
                placeholderTextColor: "#666666"
                focus: true
                enabled: !isLoading
                
                background: Rectangle {
                    color: "#3a3a3a"
                    border.color: promptInput.activeFocus ? "#5a5a5a" : "#4a4a4a"
                    border.width: 1
                    radius: 4
                }

                onAccepted: {
                    if (text.trim() !== "") {
                        generateButton.clicked()
                    }
                }
            }

            // Examples section
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: examplesColumn.height + 20
                color: "#3a3a3a"
                radius: 4
                border.color: "#4a4a4a"
                border.width: 1
                
                ColumnLayout {
                    id: examplesColumn
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.top: parent.top
                    anchors.margins: 10
                    spacing: 4
                    
                    Label {
                        text: "Example Commands"
                        font.bold: true
                        font.pixelSize: 11
                        color: "#999999"
                    }

                    Label {
                        text: "• Generate one measure of 16th note single strokes"
                        font.pixelSize: 11
                        color: "#777777"
                    }
                    Label {
                        text: "• Create paradiddles from measures 4-8"
                        font.pixelSize: 11
                        color: "#777777"
                    }
                    Label {
                        text: "• Generate triplet single strokes for 2 measures"
                        font.pixelSize: 11
                        color: "#777777"
                    }
                }
            }

            // Settings section
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Label {
                    text: "API Key:"
                    font.pixelSize: 12
                    color: "#a0a0a0"
                }

                TextField {
                    id: apiKeyInput
                    Layout.fillWidth: true
                    placeholderText: "Enter your Anthropic API key (saved automatically)"
                    echoMode: TextInput.Password
                    font.pixelSize: 11
                    color: "#ffffff"
                    placeholderTextColor: "#666666"
                    text: apiKey
                    
                    background: Rectangle {
                        color: "#16213e"
                        border.color: apiKeyInput.activeFocus ? "#4a9eff" : "#3a3a5a"
                        border.width: 1
                        radius: 4
                    }

                    onTextChanged: {
                        apiKey = text
                        savedSettings.apiKey = text
                    }
                }

                Button {
                    text: "Test"
                    enabled: apiKey.trim() !== "" && !isLoading
                    onClicked: {
                        statusLabel.text = "API key configured ✓"
                        statusLabel.color = "#2e7d32"
                    }
                }
            }

            // Action buttons
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Item {
                    Layout.fillWidth: true
                }

                BusyIndicator {
                    id: loadingSpinner
                    visible: isLoading
                    running: isLoading
                    Layout.preferredWidth: 30
                    Layout.preferredHeight: 30
                }

                Button {
                    id: generateButton
                    text: "Generate"
                    highlighted: true
                    enabled: !isLoading && promptInput.text.trim() !== "" && settingsConfigured

                    onClicked: {
                        generatePattern()
                    }
                }
            }

            // Status message
            Label {
                id: statusLabel
                Layout.fillWidth: true
                Layout.preferredHeight: 40
                text: settingsConfigured ? "Ready to generate" : "Please enter your API key"
                wrapMode: Text.WordWrap
                font.pixelSize: 12
                color: settingsConfigured ? "#2e7d32" : "#f57c00"
            }

            // Debug log viewer
            Label {
                text: "Debug Log:"
                font.bold: true
                font.pixelSize: 11
            }

            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                Layout.minimumHeight: 150
                color: "#1e1e1e"
                border.color: "#444444"
                border.width: 1

                ScrollView {
                    anchors.fill: parent
                    anchors.margins: 5
                    clip: true

                    TextArea {
                        id: debugLogArea
                        text: debugLog
                        readOnly: true
                        wrapMode: TextEdit.Wrap
                        font.family: "Courier"
                        font.pixelSize: 10
                        color: "#00ff00"
                        background: Rectangle {
                            color: "transparent"
                        }
                    }
                }
            }

            // Close button
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Button {
                    text: "Clear Log"
                    onClicked: {
                        debugLog = ""
                    }
                }

                Item {
                    Layout.fillWidth: true
                }

                Button {
                    text: "Close"
                    onClicked: {
                        mainWindow.close()
                    }
                }
            }
        }
    }
}

    // ========== MAIN ENTRY POINT ==========
    onRun: {
        if (!curScore) {
            log("ERROR: No score is currently open")
            return
        }

        mainWindow.show()
    }

    // ========== CORE FUNCTIONS ==========

    /**
     * Add a message to the debug log (both console and UI)
     */
    function log(message) {
        var timestamp = new Date().toLocaleTimeString()
        var logLine = "[" + timestamp + "] " + message
        console.log(logLine)
        debugLog += logLine + "\n"
    }

    /**
     * Main orchestration function - handles the full generation flow
     */
    function generatePattern() {
        var prompt = promptInput.text.trim()

        if (!settingsConfigured) {
            showStatus("Please enter your API key first", "error")
            return
        }

        if (prompt === "") {
            showStatus("Please enter a command", "error")
            return
        }

        // Parse the command to extract measure range if specified
        var parsedCommand = parseCommand(prompt)

        // Calculate number of measures and enhance prompt for backend
        var enhancedPrompt = prompt
        var startMeasure = 1
        var numMeasuresToGenerate = 1

        if (parsedCommand.measureRange) {
            startMeasure = parsedCommand.measureRange.start
            numMeasuresToGenerate = parsedCommand.measureRange.end - parsedCommand.measureRange.start + 1

            // Enhance prompt to specify exact measure count
            enhancedPrompt = "Generate " + numMeasuresToGenerate + " measure" +
                           (numMeasuresToGenerate > 1 ? "s" : "") + " of " +
                           prompt.replace(/(?:from\s+)?(?:measures?|bars?)\s+\d+(?:\s*(?:-|to)\s*\d+)?/i, "").trim()

            log("Parsed measure range: " + startMeasure + " to " + parsedCommand.measureRange.end)
            log("Enhanced prompt: " + enhancedPrompt)
        }

        // Show loading state
        isLoading = true
        showStatus("Generating " + numMeasuresToGenerate + " measure" + (numMeasuresToGenerate > 1 ? "s" : "") + "...", "loading")

        // Call the backend with enhanced prompt and score context
        var endMeasure = parsedCommand.measureRange ? parsedCommand.measureRange.end : startMeasure
        callBackend(enhancedPrompt, startMeasure, endMeasure, function(error, response) {
            isLoading = false

            if (error) {
                showStatus("Error: " + error, "error")
                return
            }

            // Insert the generated notes
            try {
                insertFromNotation(response.notation, startMeasure)

                var numMeasures = response.notation.measures.length
                var measureText = "measure" + (numMeasures > 1 ? "s" : "")
                var locationText = startMeasure > 1 ? " at measure " + startMeasure : ""

                showStatus("✓ Generated " + numMeasures + " " + measureText + locationText + "!", "success")
                log("✓ Generation complete! Check the score for results.")

                // Don't auto-close - let user review debug logs
                // Qt.callLater(function() {
                //     Qt.callLater(function() {
                //         mainWindow.close()
                //     })
                // })

            } catch (e) {
                showStatus("Error inserting notes: " + e.toString(), "error")
                console.log("Insert error: " + e.toString())
            }
        })
    }

    /**
     * Parse natural language command to extract intent and parameters
     */
    function parseCommand(text) {
        var result = {
            intent: null,        // "generate" | "modify"
            pattern: null,       // "paradiddles" | "single strokes" | etc.
            measureRange: null,  // {start: 4, end: 8} | null
            modification: null   // "accent" | "sticking" | etc.
        }

        // Intent detection
        if (/\b(generate|create|write|compose)\b/i.test(text)) {
            result.intent = "generate"
        } else if (/\b(add|insert|modify|change|remove)\b/i.test(text)) {
            result.intent = "modify"
        }

        // Measure range extraction - handle multiple formats:
        // "measure 2", "measures 2-4", "in measure 2", "from measure 2 to 4"
        // "first four measures", "last two measures", etc.
        var measureMatch = text.match(/(?:in\s+)?(?:from\s+)?(?:measures?|bars?)\s+(\d+)(?:\s*(?:-|to)\s*(\d+))?/i)
        if (measureMatch) {
            result.measureRange = {
                start: parseInt(measureMatch[1]),
                end: measureMatch[2] ? parseInt(measureMatch[2]) : parseInt(measureMatch[1])
            }
            log("Extracted measure range: " + result.measureRange.start + "-" + result.measureRange.end)
        }
        
        // Handle "first N measures" or "last N measures" patterns
        var firstLastMatch = text.match(/\b(first|last)\s+(\d+|one|two|three|four|five|six|seven|eight)\s+(?:measures?|bars?)/i)
        if (firstLastMatch && !result.measureRange) {
            var numWords = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8}
            var count = parseInt(firstLastMatch[2]) || numWords[firstLastMatch[2].toLowerCase()] || 1
            var position = firstLastMatch[1].toLowerCase()
            
            if (position === "first") {
                result.measureRange = { start: 1, end: count }
            } else {
                // For "last N", we'd need to know total measures - default to high range
                result.measureRange = { start: 1, end: count } // Will be adjusted by caller
            }
            log("Extracted '" + position + " " + count + "' measure range: " + result.measureRange.start + "-" + result.measureRange.end)
        }

        // Pattern detection (for future use)
        if (/\b(paradiddle|para)\b/i.test(text)) result.pattern = "paradiddles"
        if (/\b(single stroke|singles|alternating)\b/i.test(text)) result.pattern = "single strokes"
        if (/\b(triplet|trip)\b/i.test(text)) result.pattern = "triplets"
        if (/\b(fivelet|five)\b/i.test(text)) result.pattern = "fivelets"
        if (/\b(sevenlet|seven)\b/i.test(text)) result.pattern = "sevenlets"

        return result
    }

    /**
     * Extract context from current score for AI understanding
     * Reads notes, embellishments, and stickings from specified measures
     */
    function extractScoreContext(startMeasure, endMeasure) {
        if (!curScore) {
            console.log("No score open for context extraction")
            return null
        }

        console.log("Extracting context from measures " + startMeasure + " to " + endMeasure)

        var context = {
            measures: [],
            timeSignature: null,
            tempo: null
        }

        var cursor = curScore.newCursor()
        cursor.rewind(Cursor.SCORE_START)
        cursor.staffIdx = 0
        cursor.voice = 0

        // Navigate to start measure
        if (!navigateToMeasure(cursor, startMeasure)) {
            console.log("Could not navigate to measure " + startMeasure + " for context")
            return null
        }

        // Get time signature from first measure
        if (cursor.measure) {
            var ts = cursor.measure.timesigActual
            if (ts) {
                context.timeSignature = ts.numerator + "/" + ts.denominator
            }
        }

        // Extract notes from each measure
        for (var m = startMeasure; m <= endMeasure; m++) {
            var measureData = {
                number: m,
                notes: []
            }

            // Navigate to this measure
            if (m > startMeasure) {
                if (!cursor.nextMeasure()) {
                    console.log("Could not navigate to measure " + m)
                    break
                }
            }

            var measureStartTick = cursor.tick
            var measureEndTick = cursor.measure ? cursor.measure.lastSegment.tick : measureStartTick

            // Iterate through segments in this measure
            while (cursor.tick < measureEndTick && cursor.element) {
                var element = cursor.element

                if (element && element.type === Element.CHORD) {
                    var noteData = {
                        duration: getDurationCode(element.duration),
                        embellishments: [],
                        sticking: null
                    }

                    // Check for embellishments (articulations)
                    if (element.articulations) {
                        for (var a = 0; a < element.articulations.length; a++) {
                            var artic = element.articulations[a]
                            var embCode = getEmbellishmentCode(artic)
                            if (embCode) {
                                noteData.embellishments.push(embCode)
                            }
                        }
                    }

                    // Check for accent symbol
                    if (element.notes && element.notes.length > 0) {
                        var note = element.notes[0]
                        // Check for parentheses (ghost note)
                        if (note.hasParentheses) {
                            noteData.embellishments.push("G")
                        }
                    }

                    // Check for lyrics (sticking)
                    if (cursor.segment && cursor.segment.annotations) {
                        for (var i = 0; i < cursor.segment.annotations.length; i++) {
                            var annot = cursor.segment.annotations[i]
                            if (annot.type === Element.LYRICS) {
                                noteData.sticking = annot.text
                            }
                        }
                    }

                    measureData.notes.push(noteData)
                } else if (element && element.type === Element.REST) {
                    measureData.notes.push({
                        duration: getDurationCode(element.duration) + "R",
                        embellishments: [],
                        sticking: null
                    })
                }

                if (!cursor.next()) break
            }

            context.measures.push(measureData)
            console.log("Extracted measure " + m + ": " + measureData.notes.length + " notes")
        }

        return context
    }

    /**
     * Convert MuseScore duration fraction to our notation code
     */
    function getDurationCode(duration) {
        if (!duration) return "Q"

        var num = duration.numerator
        var den = duration.denominator

        // Map common durations to codes
        if (num === 1) {
            if (den === 1) return "W"
            if (den === 2) return "H"
            if (den === 4) return "Q"
            if (den === 8) return "E"
            if (den === 16) return "S"
            if (den === 32) return "T"
            if (den === 12) return "E3"  // Triplet
            if (den === 24) return "S3"
        }
        
        // Default
        return "Q"
    }

    /**
     * Get embellishment code from articulation element
     */
    function getEmbellishmentCode(articulation) {
        if (!articulation || !articulation.symbol) return null

        var sym = articulation.symbol
        if (sym === SymId.articAccentAbove || sym === SymId.articAccentBelow) {
            return "X"
        }
        // Add more mappings as needed
        return null
    }

    /**
     * Call the drum-AI backend via XMLHttpRequest
     */
    function callBackend(prompt, startMeasure, endMeasure, callback) {
        var xhr = new XMLHttpRequest()

        xhr.onreadystatechange = function() {
            if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
                console.log("Headers received from backend")
            }
            else if (xhr.readyState === XMLHttpRequest.DONE) {
                console.log("Request completed with status: " + xhr.status)

                if (xhr.status === 200) {
                    try {
                        var response = JSON.parse(xhr.responseText)
                        log("✓ Backend response received")

                        if (response.notation && response.notation.measures) {
                            // Check for embellishments in the response
                            var hasEmbellishments = false
                            var embellishmentCount = 0
                            for (var m = 0; m < response.notation.measures.length; m++) {
                                var measure = response.notation.measures[m]
                                if (measure.notes) {
                                    for (var n = 0; n < measure.notes.length; n++) {
                                        if (measure.notes[n].embellishments && measure.notes[n].embellishments.length > 0) {
                                            hasEmbellishments = true
                                            embellishmentCount += measure.notes[n].embellishments.length
                                            log("Found " + measure.notes[n].embellishments.length + " embellishment(s) on note " + n + " in measure " + m + ": " + JSON.stringify(measure.notes[n].embellishments))
                                        }
                                    }
                                }
                            }
                            if (!hasEmbellishments) {
                                log("⚠ No embellishments in backend response")
                            } else {
                                log("Total embellishments: " + embellishmentCount)
                            }

                            log("Backend returned " + response.notation.measures.length + " measure(s)")
                            callback(null, response)
                        } else {
                            callback("Invalid response format from backend", null)
                        }
                    } catch (e) {
                        callback("Failed to parse backend response: " + e.toString(), null)
                    }
                }
                else if (xhr.status === 401) {
                    callback("Invalid API key - please check your settings", null)
                }
                else if (xhr.status === 0) {
                    callback("Network error - could not reach backend", null)
                }
                else {
                    callback("Backend error (HTTP " + xhr.status + ")", null)
                }
            }
        }

        try {
            xhr.open("POST", backendUrl + "/generate-xml", true)
            xhr.setRequestHeader("Content-Type", "application/json")

            // Extract context from the target measures
            var context = null
            if (startMeasure && endMeasure) {
                context = extractScoreContext(startMeasure, endMeasure)
                if (context) {
                    log("📋 Extracted context: " + context.measures.length + " measure(s)")
                }
            }

            var requestBody = JSON.stringify({
                prompt: prompt,
                apiKey: apiKey,
                context: context  // Include score context for AI awareness
            })

            console.log("Sending request to: " + backendUrl + "/generate-xml")
            console.log("Prompt: " + prompt)
            if (context) {
                console.log("Context: " + JSON.stringify(context))
            }

            xhr.send(requestBody)
        } catch (e) {
            callback("Failed to send request: " + e.toString(), null)
        }
    }

    /**
     * Fill the remaining portion of a measure with rests
     * Based on Python compiler's normalize_measure logic
     */
    function fillMeasureWithRests(cursor) {
        if (!cursor.measure) {
            console.log("No measure to fill")
            return
        }
        
        var measureStartTick = cursor.measure.firstSegment.tick
        var measureEndTick = cursor.measure.lastSegment.tick
        var currentTick = cursor.tick
        
        // Calculate remaining ticks
        var remainingTicks = measureEndTick - currentTick
        
        if (remainingTicks <= 0) {
            console.log("Measure is already full")
            return
        }
        
        console.log("Filling measure with " + remainingTicks + " ticks of rests")
        log("Filling remaining measure with rests...")
        
        // Fill with appropriately-sized rests (32 ticks = quarter note in 4/4 time with divisions=32)
        while (remainingTicks > 0) {
            if (remainingTicks >= 32) {  // Quarter rest
                cursor.setDuration(1, 4)
                cursor.addRest()
                remainingTicks -= 32
                console.log("Added quarter rest")
            } else if (remainingTicks >= 16) {  // Eighth rest
                cursor.setDuration(1, 8)
                cursor.addRest()
                remainingTicks -= 16
                console.log("Added eighth rest")
            } else if (remainingTicks >= 8) {  // Sixteenth rest
                cursor.setDuration(1, 16)
                cursor.addRest()
                remainingTicks -= 8
                console.log("Added sixteenth rest")
            } else {  // Thirty-second rest
                cursor.setDuration(1, 32)
                cursor.addRest()
                remainingTicks -= 4
                console.log("Added thirty-second rest")
            }
        }
    }

    /**
     * Insert notes from JSON notation into the score
     * Uses separate undo transactions per measure to prevent crashes with large operations
     */
    function insertFromNotation(notation, startMeasure) {
        if (!curScore) {
            throw new Error("No score is currently open")
        }

        console.log("Starting note insertion at measure " + startMeasure)
        log("Processing " + notation.measures.length + " measure(s)...")

        // Phase 1: BULK DELETE - Clear all target measures in one transaction
        console.log("Phase 1: Clearing measures " + startMeasure + " to " + (startMeasure + notation.measures.length - 1))
        curScore.startCmd()
        try {
            var cursor = curScore.newCursor()
            cursor.inputStateMode = Cursor.INPUT_STATE_SYNC_WITH_SCORE
            cursor.rewind(Cursor.SCORE_START)
            cursor.staffIdx = 0
            cursor.voice = 0
            
            // Navigate to first measure
            if (navigateToMeasure(cursor, startMeasure)) {
                var firstMeasure = cursor.measure
                
                // Navigate to last measure
                if (navigateToMeasure(cursor, startMeasure + notation.measures.length - 1)) {
                    var lastMeasure = cursor.measure
                    
                    // Select full range
                    var startTick = firstMeasure.firstSegment.tick
                    var endTick = lastMeasure.lastSegment.tick + 1
                    
                    console.log("Selecting ticks " + startTick + " to " + endTick)
                    curScore.selection.selectRange(startTick, endTick, 0, 1)
                    cmd("delete")
                    curScore.selection.clear()
                    console.log("Bulk delete complete")
                }
            }
        } finally {
            curScore.endCmd()
        }
        
        // Phase 2: BULK INSERT - Add all notes in one transaction
        console.log("Phase 2: Inserting new content")
        curScore.startCmd()
        
        try {
            for (var m = 0; m < notation.measures.length; m++) {
                var measure = notation.measures[m]
                var currentMeasureNum = startMeasure + m
                
                console.log("========== Measure " + currentMeasureNum + " (" + (m+1) + "/" + notation.measures.length + ") ==========")
                log("Measure " + currentMeasureNum + "/" + (startMeasure + notation.measures.length - 1))
            
            try {
                var cursor = curScore.newCursor()
                cursor.inputStateMode = Cursor.INPUT_STATE_SYNC_WITH_SCORE
                cursor.rewind(Cursor.SCORE_START)
                cursor.staffIdx = 0
                cursor.voice = 0

                if (!navigateToMeasure(cursor, currentMeasureNum)) {
                    console.log("ERROR: Could not navigate to measure " + currentMeasureNum)
                    continue  // Don't endCmd - we're in one big transaction
                }
                
                // No need to clear - bulk delete already handled it

                // Process notes with tuplet grouping
                var n = 0
                while (n < measure.notes.length) {
                    var noteData = measure.notes[n]
                    var tupletInfo = getTupletInfo(noteData.duration)
                    
                    if (tupletInfo) {
                        // This is a tuplet note - group by correct tuplet size
                        var tupletSize = parseInt(tupletInfo.type)
                        var tupletGroup = []
                        
                        for (var i = 0; i < tupletSize && (n + i) < measure.notes.length; i++) {
                            var checkNote = measure.notes[n + i]
                            var checkInfo = getTupletInfo(checkNote.duration)
                            if (checkInfo && checkInfo.type === tupletInfo.type) {
                                tupletGroup.push(checkNote)
                            } else {
                                break
                            }
                        }
                        
                        if (tupletGroup.length === tupletSize) {
                            addTupletGroup(cursor, tupletGroup, tupletInfo)
                            n += tupletSize
                        } else {
                            for (var j = 0; j < tupletGroup.length; j++) {
                                addNoteFromJSON(cursor, tupletGroup[j])
                            }
                            n += tupletGroup.length
                        }
                    } else {
                        // Regular note
                        addNoteFromJSON(cursor, noteData)
                        n++
                    }
                }

                // Log cursor position BEFORE filling rests
                console.log("After notes - cursor at tick " + cursor.tick + ", measure: " + (cursor.measure ? cursor.measure.no : "null"))
                
                // Fill remaining space with rests - only if cursor is still in the target measure
                var targetMeasure = cursor.measure
                if (targetMeasure && targetMeasure.no === currentMeasureNum - 1) {  // no is 0-indexed
                    fillMeasureWithRests(cursor)
                } else {
                    console.log("WARNING: Cursor drifted to measure " + (targetMeasure ? targetMeasure.no + 1 : "null") + ", skipping rest fill")
                }
                
                // Log cursor position AFTER filling rests
                console.log("After rest fill - cursor at tick " + cursor.tick + ", measure: " + (cursor.measure ? cursor.measure.no : "null"))
                
                console.log("========== Measure " + currentMeasureNum + " COMPLETE ==========")
                
            } catch (e) {
                console.log("ERROR in measure " + currentMeasureNum + ": " + e.toString())
                log("⚠ Error in measure " + currentMeasureNum)
            }
        }  // End of measure loop
        
        } finally {
            curScore.endCmd()  // End bulk insert transaction
        }

        console.log("Note insertion completed successfully")
        log("✓ Generation complete!")
    }

    /**
     * Check if a duration is a tuplet and return info about it
     * Returns null for regular durations, or {type: "3"/"5"/"7", baseDuration: "E"/"Q"/"S"} for tuplets
     */
    function getTupletInfo(duration) {
        // Match patterns like E3, Q5, S7 (triplets, quintuplets, septuplets)
        var match = duration.match(/^([QEST])([357])$/)
        if (match) {
            return {
                type: match[2],       // "3", "5", or "7"
                baseDuration: match[1] // "Q", "E", "S", or "T"
            }
        }
        return null
    }

    /**
     * Add a group of tuplet notes with proper bracket
     */
    function addTupletGroup(cursor, notes, tupletInfo) {
        console.log("Adding tuplet group: " + notes.length + " notes, ratio " + tupletInfo.type + "/2")
        
        // Calculate ratio and total duration based on tuplet type
        var tupletRatio = parseInt(tupletInfo.type)
        
        // Total duration the tuplet should occupy
        // For triplets: 3 notes in time of 2, so total = 2 * base duration
        // For quintuplets: 5 notes in time of 4, so total = 4 * base duration
        var totalNumerator, totalDenominator
        var noteNumerator, noteDenominator
        
        // Base duration denominator
        var baseDen = {
            "W": 1, "H": 2, "Q": 4, "E": 8, "S": 16, "T": 32
        }[tupletInfo.baseDuration] || 8
        
        // ALL tuplets use N:2 ratio (N notes in time of 2 normal notes)
        // This gives: triplets=12/measure, quintuplets=20/measure, sevenlets=28/measure
        // Triplet: 3:2 (3 notes in time of 2 eighths = 1 beat)
        // Quintuplet: 5:2 (5 notes in time of 2 eighths = 1 beat)
        // Sevenlet: 7:2 (7 notes in time of 2 eighths = 1 beat)
        var normalNotes = 2  // Always 2 for all tuplet types
        
        // Total duration = 2 × base note value = 1 beat
        // For E-based: 2/8 = 1/4 (quarter note)
        totalNumerator = 2
        totalDenominator = baseDen
        noteNumerator = 1
        noteDenominator = baseDen
        
        console.log("Tuplet total duration: " + totalNumerator + "/" + totalDenominator)
        console.log("Each note duration: " + noteNumerator + "/" + noteDenominator)
        
        // Create the tuplet
        // addTuplet(ratio, duration) where ratio = actual/normal, duration = total time span
        try {
            cursor.addTuplet(
                fraction(tupletRatio, normalNotes),                   // ratio: 3/2, 5/2, or 7/2
                fraction(totalNumerator, totalDenominator)            // total duration: 2/8 = 1/4
            )
            console.log("Tuplet bracket created")
        } catch (e) {
            console.log("ERROR creating tuplet: " + e.toString())
            log("⚠ Tuplet creation failed: " + e.toString())
            // Fall back to adding notes without tuplet bracket
            for (var i = 0; i < notes.length; i++) {
                addNoteFromJSON(cursor, notes[i])
            }
            return
        }
        
        // Set duration for notes within the tuplet - ONCE before adding all notes
        cursor.setDuration(noteNumerator, noteDenominator)
        log("Creating " + tupletRatio + "-tuplet with " + notes.length + " notes")
        
        // Add each note in the tuplet
        // IMPORTANT: Don't manually rewind/advance - let the tuplet handle cursor state
        for (var i = 0; i < notes.length; i++) {
            var noteData = notes[i]
            
            console.log("Adding tuplet note " + (i+1) + " of " + notes.length + " at tick " + cursor.tick)
            
            // Simply add the note - cursor will auto-advance
            cursor.addNote(38)
            
            // Move cursor back to access the note we just added for embellishments
            cursor.prev()
            
            if (cursor.element && cursor.element.type === Element.CHORD) {
                // Add embellishments if any
                if (noteData.embellishments && noteData.embellishments.length > 0) {
                    for (var e = 0; e < noteData.embellishments.length; e++) {
                        addEmbellishment(cursor, cursor.element, noteData.embellishments[e])
                    }
                }
                
                // Add sticking
                if (noteData.sticking) {
                    addSticking(cursor, noteData.sticking)
                }
            }
            
            // Move forward to next position
            cursor.next()
        }
        
        console.log("Tuplet group complete")
    }

    /**
     * Navigate cursor to a specific measure number
     */
    function navigateToMeasure(cursor, measureNumber) {
        cursor.rewind(Cursor.SCORE_START)

        // MuseScore measures are 0-indexed internally, but display 1-indexed
        var targetIndex = measureNumber - 1

        var iterations = 0
        var maxIterations = 1000  // Safety limit

        while (cursor.measure && cursor.measure.no < targetIndex && iterations < maxIterations) {
            if (!cursor.nextMeasure()) {
                console.log("WARNING: Could not navigate to measure " + measureNumber)
                return false
            }
            iterations++
        }

        if (iterations >= maxIterations) {
            console.log("ERROR: Navigation timeout - too many iterations")
            return false
        }

        console.log("Navigated to measure " + measureNumber + " (index " + cursor.measure.no + ")")
        return true
    }

    /**
     * Clear content of the current measure (where cursor is positioned)
     * Uses selection + delete approach for single measure - more stable than bulk operations
     */
    function clearMeasureContent(cursor) {
        var measure = cursor.measure
        if (!measure) {
            console.log("WARNING: No measure at cursor position")
            return
        }
        
        var startTick = measure.firstSegment.tick
        var endTick = measure.lastSegment.tick + 1
        
        console.log("Clearing measure content from tick " + startTick + " to " + endTick)
        
        // Select just this measure and delete
        curScore.selection.selectRange(startTick, endTick, 0, 1)
        cmd("delete")
        curScore.selection.clear()
        
        console.log("Measure cleared")
    }

    /**
     * Delete existing content in a range of measures
     * This removes notes/rests so new content can be properly inserted
     * Uses MuseScore's selection + cmd("delete") approach from mcp-musescore
     */
    function deleteRangeContent(cursor, startMeasure, endMeasure) {
        console.log("Clearing content from measures " + startMeasure + " to " + endMeasure)

        // Collect all elements to delete first (safer than deleting while iterating)
        var elementsToDelete = []
        
        for (var measureNum = startMeasure; measureNum <= endMeasure; measureNum++) {
            cursor.rewind(Cursor.SCORE_START)
            cursor.staffIdx = 0
            cursor.voice = 0

            if (!navigateToMeasure(cursor, measureNum)) {
                console.log("WARNING: Could not navigate to measure " + measureNum)
                continue
            }

            var measure = cursor.measure
            if (!measure) {
                console.log("WARNING: No measure found at " + measureNum)
                continue
            }

            // Collect ChordRest segments
            var segment = measure.firstSegment
            while (segment && segment.tick < measure.lastSegment.tick) {
                if (segment.segmentType === Segment.ChordRest) {
                    var element = segment.elementAt(0)
                    if (element) {
                        elementsToDelete.push(element)
                    }
                }
                segment = segment.next
            }
        }
        
        console.log("Collected " + elementsToDelete.length + " elements to delete")
        
        // Delete in reverse order (safer for score structure)
        for (var i = elementsToDelete.length - 1; i >= 0; i--) {
            try {
                removeElement(elementsToDelete[i])
                if (i % 20 === 0) {
                    console.log("Deleted " + (elementsToDelete.length - i) + "/" + elementsToDelete.length + " elements")
                }
            } catch (e) {
                console.log("ERROR removing element: " + e.toString())
            }
        }
        
        console.log("Content clearing completed")
    }

    /**
     * Add a single note from JSON notation
     * CRITICAL: Using MIDI pitch 38 for Acoustic Snare (General MIDI standard)
     */
    function addNoteFromJSON(cursor, noteData) {
        var duration = noteData.duration

        // Check if it's a rest
        var isRest = duration.endsWith('R')

        // Get duration mapping
        var dur = durationMap[duration]
        if (!dur) {
            console.log("WARNING: Unknown duration '" + duration + "', defaulting to quarter note")
            dur = {num: 1, den: 4}
        }

        console.log("Adding note with duration " + duration + " -> " + dur.num + "/" + dur.den + ", pitch 38 (snare), sticking: " + noteData.sticking)

        // Save the current tick position BEFORE adding the note
        var startTick = cursor.tick

        // Set duration FIRST - this determines the note duration
        cursor.setDuration(dur.num, dur.den)

        // Add note or rest
        if (isRest) {
            console.log("Adding rest")
            cursor.addRest()
        } else {
            // CRITICAL: pitch 38 = Acoustic Snare in General MIDI standard
            // Using pitch 60 (middle C) was wrong for drum staffs!
            console.log("Calling cursor.addNote(38) - Acoustic Snare at tick " + startTick)
            cursor.addNote(38)
            console.log("Note added, cursor auto-advanced to tick " + cursor.tick)

            // IMPORTANT: cursor.addNote() advanced the cursor to the next position
            // We need to rewind back to the note we just created to add embellishments and lyrics
            cursor.rewindToTick(startTick)
            console.log("Rewound to tick " + startTick + " to access the note we just created")

            // Verify we have the element
            if (!cursor.element) {
                console.log("ERROR: cursor.element is null after rewinding!")
                return
            }

            console.log("cursor.element type: " + cursor.element.type)

            // Add embellishments if any
            if (noteData.embellishments && noteData.embellishments.length > 0) {
                log("Adding " + noteData.embellishments.length + " embellishment(s): " + JSON.stringify(noteData.embellishments))
                for (var e = 0; e < noteData.embellishments.length; e++) {
                    addEmbellishment(cursor, cursor.element, noteData.embellishments[e])
                }
            }

            // Add sticking as lyric if specified
            if (noteData.sticking) {
                console.log("Adding sticking: " + noteData.sticking)
                addSticking(cursor, noteData.sticking)
            }

            // Now advance cursor to where addNote() left it (for the next note)
            // Calculate the end tick based on the duration
            var durationTicks = cursor.element.duration.ticks
            cursor.rewindToTick(startTick + durationTicks)
            console.log("Advanced cursor to next position at tick " + cursor.tick)
        }

        console.log("Note/rest processing complete")
    }

    /**
     * Add embellishment to a note element
     * NOTE: This function receives a chord element (from cursor.element after addNote)
     * 
     * API Limitations (as of MuseScore 4.5):
     * - Accents: ✓ Work via articulation symbol
     * - Flams: Using cmd("acciaccatura") - requires note selection
     * - Diddles: ✗ Element.TREMOLO returns null - not available in plugin API
     * - Ghost notes: hasParentheses property creates separate elements
     */
    function addEmbellishment(cursor, element, embellishmentCode) {
        if (!element) {
            console.log("WARNING: Cannot add embellishment - element is null")
            log("WARNING: Cannot add embellishment - element is null")
            return
        }

        try {
            switch(embellishmentCode) {
                case "X": // Accent - WORKS
                    var accent = newElement(Element.ARTICULATION)
                    accent.symbol = SymId.articAccentAbove
                    element.add(accent)
                    console.log("✓ Added accent articulation")
                    log("✓ Added accent")
                    break

                case "F": // Flam (grace note)
                    console.log("Attempting flam via cmd(acciaccatura)...")
                    
                    // First, select the current note
                    if (element.notes && element.notes.length > 0) {
                        curScore.selection.select(element.notes[0])
                        console.log("Selected note for grace note")
                        
                        // Try using MuseScore's built-in acciaccatura command
                        cmd("acciaccatura")
                        console.log("Called cmd(acciaccatura)")
                        log("✓ FLAM: Applied via cmd(acciaccatura)")
                    } else {
                        console.log("ERROR: No notes in chord for flam")
                        log("⚠ FLAM ERROR: No notes in chord")
                    }
                    break

                case "D": // Diddle (tremolo/double stroke)
                    console.log("Attempting diddle via cursor.add()...")
                    
                    // Try using cursor.add() which is the documented way to add elements
                    try {
                        // Try creating TREMOLO element and adding via cursor
                        var tremolo = newElement(Element.TREMOLO)
                        console.log("newElement(Element.TREMOLO) result: " + tremolo)
                        
                        if (tremolo) {
                            // Set tremolo type for single-note tremolo (16th note subdivision)
                            if (typeof TremoloType !== 'undefined') {
                                console.log("TremoloType is defined")
                                // Log available TremoloType values
                                for (var k in TremoloType) {
                                    console.log("TremoloType." + k + " = " + TremoloType[k])
                                }
                            }
                            
                            cursor.add(tremolo)
                            console.log("Added tremolo via cursor.add()")
                            log("✓ DIDDLE: Applied via cursor.add()")
                        } else {
                            console.log("Element.TREMOLO returned null")
                            
                            // Fallback: try TREMOLO_SINGLECHORD
                            var tremolo2 = newElement(Element.TREMOLO_SINGLECHORD)
                            console.log("newElement(Element.TREMOLO_SINGLECHORD) result: " + tremolo2)
                            
                            if (tremolo2) {
                                cursor.add(tremolo2)
                                console.log("Added tremolo via TREMOLO_SINGLECHORD")
                                log("✓ DIDDLE: Applied via TREMOLO_SINGLECHORD")
                            } else {
                                log("⚠ DIDDLE: Both TREMOLO and TREMOLO_SINGLECHORD returned null")
                            }
                        }
                    } catch (e) {
                        console.log("Tremolo error: " + e.toString())
                        log("⚠ DIDDLE ERROR: " + e.toString())
                    }
                    break

                case "G": // Ghost note (softer, shown with parentheses)
                    console.log("Adding ghost note via cmd(add-parentheses)...")
                    
                    if (element.notes && element.notes.length > 0) {
                        // Select the note first
                        curScore.selection.select(element.notes[0])
                        console.log("Selected note for parentheses")
                        
                        // Use the correct MuseScore command for adding parentheses
                        cmd("add-parentheses")
                        console.log("Called cmd(add-parentheses)")
                        log("✓ GHOST NOTE: Applied via cmd(add-parentheses)")
                    } else {
                        console.log("ERROR: Cannot add ghost note - no notes in chord")
                        log("⚠ GHOST NOTE ERROR: No notes in chord")
                    }
                    break

                default:
                    console.log("WARNING: Unknown embellishment code '" + embellishmentCode + "'")
                    log("⚠ Unknown embellishment: " + embellishmentCode)
            }
        } catch (e) {
            console.log("ERROR adding embellishment '" + embellishmentCode + "': " + e.toString())
            log("⚠ ERROR adding " + embellishmentCode + ": " + e.toString())
        }
    }

    /**
     * Add sticking as lyric under note
     */
    function addSticking(cursor, stickingChar) {
        try {
            var lyric = newElement(Element.LYRICS)
            lyric.text = stickingChar  // "R" or "L"
            cursor.add(lyric)
        } catch (e) {
            console.log("ERROR adding sticking: " + e.toString())
        }
    }

    /**
     * Show status message to user
     */
    function showStatus(message, type) {
        statusLabel.text = message

        switch(type) {
            case "success":
                statusLabel.color = "#2e7d32"  // Green
                break
            case "error":
                statusLabel.color = "#c62828"  // Red
                break
            case "loading":
                statusLabel.color = "#1976d2"  // Blue
                break
            default:
                statusLabel.color = "#555555"  // Gray
        }
    }
}
