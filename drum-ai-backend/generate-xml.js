// generate-xml.js
const { Router } = require("express");
const fetch = require("node-fetch");
const Anthropic = require("@anthropic-ai/sdk");
const { selectFewShotExamples, formatExamplesForPrompt } = require("./fewShotExamples");
require("dotenv").config();

const router = Router();

const LAMBDA_URL = process.env.AWS_LAMBDA_URL;

router.post("/", async (req, res) => {
  try {
    // 1. Check for prompt, API key, and context in request body
    const { prompt, apiKey, context } = req.body;
    console.log("DEBUG: Incoming prompt:", prompt);
    if (context) {
      console.log("DEBUG: Received context with", context.measures?.length || 0, "measure(s)");
    }

    if (!prompt) {
      console.log("DEBUG: Missing prompt.");
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Use API key from request body if provided, otherwise fall back to environment variable
    const effectiveApiKey = apiKey || process.env.ANTHROPIC_API_KEY;

    if (!effectiveApiKey) {
      console.log("DEBUG: No API key provided");
      return res.status(401).json({ error: "API key is required. Please provide it in the request or set ANTHROPIC_API_KEY environment variable." });
    }

    // Create Anthropic client with the effective API key
    const anthropic = new Anthropic({ apiKey: effectiveApiKey });
    console.log("DEBUG: Using API key from:", apiKey ? "request body" : "environment variable");

    // Log your environment variables to ensure they're defined
    console.log("DEBUG: LAMBDA_URL:", process.env.AWS_LAMBDA_URL || "Not set");
    console.log("DEBUG: ANTHROPIC_API_KEY:", process.env.ANTHROPIC_API_KEY ? "Found" : "Not set");

    // 2. Select few-shot examples based on prompt
    const fewShotExamples = selectFewShotExamples(prompt, 3);
    const examplesText = formatExamplesForPrompt(fewShotExamples);
    console.log("DEBUG: Selected", fewShotExamples.length, "few-shot examples");

    // 3. Call Claude 4.5 Sonnet with structured output
    let drumNotationJSON;
    try {
      console.log("DEBUG: About to call Claude...");

      let systemPrompt = `You are a professional drum notation generator. You convert natural language descriptions into structured JSON drum notation.

**Viraaj's Drum Notation System:**
- **Sticking**: R (right hand), L (left hand)
- **Duration**: W (whole), H (half), Q (quarter), E (eighth), S (sixteenth), T (thirty-second)
- **Tuplets** (IMPORTANT - use the correct suffix based on the user's request):
  - Triplets: Add '3' suffix (Q3, E3, S3) - 3 notes in space of 2
    Example: "eighth note triplets" → use E3 duration
    In 4/4 time: 12 notes (4 groups of 3) fills one measure
  - Fivelets/Quintuplets: Add '5' suffix (Q5, E5, S5) - 5 notes in space of 2
    Example: "eighth note fivelets" → use E5 duration (NOT E3!)
    In 4/4 time: 20 notes (4 groups of 5) fills one measure
  - Sevenlets/Septuplets: Add '7' suffix (Q7, E7, S7) - 7 notes in space of 2
    Example: "eighth note sevenlets" → use E7 duration (NOT E3!)
    In 4/4 time: 28 notes (4 groups of 7) fills one measure
- **Embellishments**: X (accent), F (flam/grace note), D (diddle/double stroke), G (ghost note)
- **Rests**: Use duration + 'R' suffix (e.g., QR for quarter rest)

**JSON Format:**
{
  "timeSignature": [4, 4],
  "measures": [
    {
      "notes": [
        { "sticking": "R", "duration": "S" },
        { "sticking": "L", "duration": "S", "embellishments": ["X"] }
      ]
    }
  ]
}

${examplesText}Generate valid JSON matching this format. Ensure each measure adds up to the correct time signature (default 4/4 = 1.0 beats).

CRITICAL: When the user asks for "fivelets" or "quintuplets", use duration E5/Q5/S5 (NOT E3). When they ask for "sevenlets" or "septuplets", use duration E7/Q7/S7 (NOT E3).`;

      // Add context if provided
      if (context && context.measures && context.measures.length > 0) {
        systemPrompt += `\n\n**CURRENT SCORE CONTEXT:**
The user's score currently contains the following in the target measure(s):
${JSON.stringify(context, null, 2)}

**CONTEXT-AWARE COMMANDS - INTELLIGENT MERGING:**
When the user specifies PARTIAL measure modifications (e.g., "first two beats", "last beat"), you must INTELLIGENTLY MERGE by:

1. **Parse the request** to understand which beats to modify
2. **Preserve EXACT duration codes** from context for unmodified beats
3. **Generate a COMPLETE measure** with the merged result

**CRITICAL: When preserving existing notes, copy their EXACT duration codes from the context (E3, Q5, etc.), not just the count!**

**Example 1: Partial replacement with existing content**
Context shows: 12 notes with duration "E3" (triplets filling all 4 beats in 4/4)
User says: "make the first two beats of measure 1 into quintuplets"

YOU MUST GENERATE:
- Beats 1-2: 10 notes with duration "E5" (quintuplets)
- Beats 3-4: 6 notes with duration "E3" (COPY EXACT duration from context, NOT plain "E"!)
Result: First 10 notes are E5, last 6 notes are E3

**Example 2: Partial replacement with empty measure**
Context: Measure 1 is empty (whole rest)
User says: "make the first two beats quintuplets"

YOU MUST GENERATE:
- Beats 1-2: 10 notes with duration "E5"
- Beats 3-4: Will be auto-filled with rests by plugin
Result: 10 notes (partial measure OK)

**Example 3: Full replacement**
Context: Measure has any content
User says: "change measure 1 to triplets"

YOU MUST GENERATE:
- All 4 beats: 12 notes with duration "E3"
Result: Replace everything`;
      }

      const response = await anthropic.beta.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4096,
        betas: ["structured-outputs-2025-11-13"],
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        system: systemPrompt,
        output_format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              timeSignature: {
                type: "array",
                items: { type: "integer" }
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
                          sticking: {
                            type: "string",
                            enum: ["R", "L"]
                          },
                          duration: {
                            type: "string",
                            enum: ["W", "H", "Q", "E", "S", "T", "Q3", "E3", "S3", "Q5", "E5", "S5", "Q7", "E7", "S7", "WR", "HR", "QR", "ER", "SR", "TR"]
                          },
                          embellishments: {
                            type: "array",
                            items: {
                              type: "string",
                              enum: ["X", "F", "D", "G"]
                            }
                          }
                        },
                        required: ["sticking", "duration"],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ["notes"],
                  additionalProperties: false
                }
              }
            },
            required: ["timeSignature", "measures"],
            additionalProperties: false
          }
        }
      });

      drumNotationJSON = JSON.parse(response.content[0].text);
      console.log("DEBUG: Claude response JSON:", JSON.stringify(drumNotationJSON, null, 2));
    } catch (err) {
      console.error("DEBUG: Claude API call failed:", err);
      return res.status(500).json({
        error: "Claude API error",
        details: err.message || err
      });
    }

    if (!drumNotationJSON || !drumNotationJSON.measures) {
      console.error("DEBUG: Invalid JSON structure from Claude");
      return res.status(500).json({
        error: "Invalid JSON structure returned from Claude"
      });
    }

    // 4. Call AWS Lambda with JSON notation
    let compiledXml = null;
    try {
      console.log("DEBUG: About to call AWS Lambda...");

      const compileRes = await fetch(LAMBDA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonNotation: drumNotationJSON
        }),
      });

      // Log the status, text, etc. from AWS Lambda
      console.log("DEBUG: Lambda response status:", compileRes.status);
      const rawLambdaText = await compileRes.text();
      console.log("DEBUG: Lambda raw response text:", rawLambdaText);

      // If compileRes not OK
      if (!compileRes.ok) {
        return res.status(500).json({
          error: "Compiler failed",
          details: rawLambdaText,
          notation: drumNotationJSON
        });
      }

      // Parse the Lambda JSON response
      const data = JSON.parse(rawLambdaText);
      console.log("DEBUG: Lambda parsed data:", data);

      // Directly access 'xml' from the response
      compiledXml = data.xml;

      if (!compiledXml) {
        throw new Error("No XML returned from compiler");
      }

    } catch (err) {
      console.error("DEBUG: Error calling AWS Lambda:", err);
      return res.status(500).json({
        error: "Failed to call AWS Lambda compiler",
        details: err.message,
        notation: drumNotationJSON
      });
    }

    // 5. Return JSON: { xml, notation }
    console.log("DEBUG: Final success, returning 200");
    return res.status(200).json({
      xml: compiledXml,              // from Lambda
      notation: drumNotationJSON,    // from Claude
    });

  } catch (error) {
    console.error("DEBUG: Outer catch, API Error:", error);
    return res.status(500).json({
      error: "Server error",
      details: error.message
    });
  }
});

module.exports = router;
