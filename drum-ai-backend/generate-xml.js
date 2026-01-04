// generate-xml.js
const { Router } = require("express");
const fetch = require("node-fetch");
const Anthropic = require("@anthropic-ai/sdk");
const { selectFewShotExamples, formatExamplesForPrompt } = require("./fewShotExamples");
require("dotenv").config();

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LAMBDA_URL = process.env.AWS_LAMBDA_URL;  

router.post("/", async (req, res) => {
  try {
    // 1. Check for prompt in request body
    const { prompt } = req.body;
    console.log("DEBUG: Incoming prompt:", prompt);

    if (!prompt) {
      console.log("DEBUG: Missing prompt.");
      return res.status(400).json({ error: "Prompt is required" });
    }

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

      const systemPrompt = `You are a professional drum notation generator. You convert natural language descriptions into structured JSON drum notation.

**Viraaj's Drum Notation System:**
- **Sticking**: R (right hand), L (left hand)
- **Duration**: W (whole), H (half), Q (quarter), E (eighth), S (sixteenth), T (thirty-second)
- **Triplets**: Add '3' suffix (Q3, E3, S3)
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

${examplesText}Generate valid JSON matching this format. Ensure each measure adds up to the correct time signature (default 4/4 = 1.0 beats).`;

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
                            enum: ["W", "H", "Q", "E", "S", "T", "Q3", "E3", "S3", "WR", "HR", "QR", "ER", "SR", "TR"]
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
