// generate-xml.js
const { Router } = require("express");
const fetch = require("node-fetch");
const OpenAI = require("openai");
require("dotenv").config();

const router = Router();
const openAIKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: openAIKey });

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
    console.log("DEBUG: OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "Found" : "Not set");

    // 2. Call OpenAI
    let completion;
    try {
      console.log("DEBUG: About to call OpenAI...");
      completion = await openai.chat.completions.create({
        model: "ft:gpt-4o-2024-08-06:personal::AvbNU45V", 
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant who generates Viraaj's Music Notation."
          },
          { role: "user", content: prompt }
        ],
      });
      console.log("DEBUG: OpenAI response:", JSON.stringify(completion, null, 2));
    } catch (err) {
      console.error("DEBUG: OpenAI API call failed:", err);
      return res.status(500).json({
        error: "OpenAI API error",
        details: err.message || err
      });
    }

    // Extract the notation text returned by OpenAI
    if (!completion || !completion.choices || !completion.choices[0]) {
      console.error("DEBUG: No choices in OpenAI completion.");
      return res.status(500).json({
        error: "No completion was returned from OpenAI."
      });
    }

    const viraajsNotation = completion.choices[0].message.content.trim();
    console.log("DEBUG: viraajsNotation:", viraajsNotation);

    // 3. Call AWS Lambda
    let compiledXml = null;
    try {
      console.log("DEBUG: About to call AWS Lambda...");

      const compileRes = await fetch(LAMBDA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          notation: viraajsNotation  // Changed: removed the extra 'body' nesting
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
          notation: viraajsNotation
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
        notation: viraajsNotation
      });
    }

    // 4. Return JSON: { xml, notation }
    console.log("DEBUG: Final success, returning 200");
    return res.status(200).json({
      xml: compiledXml,         // from Lambda
      notation: viraajsNotation, // from OpenAI
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
