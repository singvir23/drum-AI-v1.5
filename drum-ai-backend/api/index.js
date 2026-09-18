// HTTP layer. Exported as an Express app so Vercel can run it as a serverless function;
// `server.js` boots the same app locally.

import express from "express";
import cors from "cors";
import { createRequire } from "node:module";
import { generate, describeApiError, DEFAULT_MODEL } from "../src/generate.js";
import { validateMeasure, repairMeasure } from "../src/notation.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "256kb" }));

app.get("/", (_req, res) => {
  res.json({ name: "drum-ai-backend", version, model: DEFAULT_MODEL, ok: true });
});

async function handleGenerate(req, res) {
  const started = Date.now();
  try {
    const result = await generate(req.body, { log: (m) => console.log(`[generate] ${m}`) });
    console.log(
      `[generate] ok in ${Date.now() - started}ms: start=${result.startMeasure} measures=${result.measures.length} ` +
        `tokens=${result.usage?.input_tokens ?? "?"}/${result.usage?.output_tokens ?? "?"} warnings=${result.warnings.length}`,
    );
    res.json(result);
  } catch (err) {
    const { status, message } = describeApiError(err);
    if (status >= 500) console.error("[generate] failed:", err);
    else console.log(`[generate] ${status}: ${message}`);
    res.status(status).json({ error: message });
  }
}

app.post("/generate", handleGenerate);

// Handy for debugging notation by hand: POST { "measure": "RS LS ...", "timeSignature": "4/4" }
app.post("/validate", (req, res) => {
  const { measure = "", timeSignature = "4/4" } = req.body || {};
  try {
    const v = validateMeasure(measure, timeSignature);
    const r = v.valid ? null : repairMeasure(measure, timeSignature);
    res.json({ valid: v.valid, errors: v.errors, repaired: r?.measure ?? null, warnings: r?.warnings ?? [] });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Body must be valid JSON." });
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "Request body too large." });
  console.error("[http] unhandled:", err);
  res.status(500).json({ error: "Unexpected server error." });
});

export default app;
