// Structured-output schema for Claude and validation of the plugin's request body.

import { parseTimeSignature } from "./notation.js";

/** JSON schema handed to Claude via output_config.format. */
export const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    startMeasure: {
      type: "integer",
      description: "1-based number of the first measure to replace.",
    },
    measures: {
      type: "array",
      description: "One compact token string per measure, in order, replacing startMeasure onwards.",
      items: { type: "string" },
    },
    summary: {
      type: "string",
      description: "One sentence describing what was written and in which measures.",
    },
  },
  required: ["startMeasure", "measures", "summary"],
  additionalProperties: false,
};

export class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const MAX_PROMPT_CHARS = 2000;
const MAX_CONTEXT_MEASURES = 200;
const MAX_MEASURE_CHARS = 600;

/**
 * Validate and normalise the request body. Returns { prompt, apiKey, score } where score is
 * null (no context) or { timeSignature, measureCount, selection, measures, firstListedMeasure }.
 */
export function normalizeRequest(body) {
  if (!body || typeof body !== "object") throw new RequestError("Request body must be a JSON object.");

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) throw new RequestError("Prompt is required.");
  if (prompt.length > MAX_PROMPT_CHARS) throw new RequestError(`Prompt is too long (max ${MAX_PROMPT_CHARS} characters).`);

  const apiKey = typeof body.apiKey === "string" && body.apiKey.trim() ? body.apiKey.trim() : null;

  let score = null;
  if (body.score != null) {
    const s = body.score;
    if (typeof s !== "object") throw new RequestError("score must be an object.");

    let timeSignature = "4/4";
    if (s.timeSignature != null) {
      try {
        timeSignature = parseTimeSignature(s.timeSignature).text;
      } catch (e) {
        throw new RequestError(e.message);
      }
    }

    const measures = Array.isArray(s.measures) ? s.measures : [];
    if (measures.length > MAX_CONTEXT_MEASURES) throw new RequestError(`Too many context measures (max ${MAX_CONTEXT_MEASURES}).`);
    const cleanMeasures = measures.map((m, i) => {
      if (m == null) return "";
      if (typeof m !== "string") throw new RequestError(`score.measures[${i}] must be a string.`);
      if (m.length > MAX_MEASURE_CHARS) throw new RequestError(`score.measures[${i}] is too long.`);
      return m.trim();
    });

    let measureCount = Number.isInteger(s.measureCount) && s.measureCount >= 0 ? s.measureCount : cleanMeasures.length;

    let firstListedMeasure = 1;
    if (Number.isInteger(s.firstListedMeasure) && s.firstListedMeasure >= 1) firstListedMeasure = s.firstListedMeasure;
    if (measureCount < firstListedMeasure + cleanMeasures.length - 1) measureCount = firstListedMeasure + cleanMeasures.length - 1;

    let selection = null;
    if (s.selection != null) {
      const { start, end } = s.selection;
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
        throw new RequestError("score.selection must be { start, end } with 1 <= start <= end.");
      }
      selection = { start, end };
    }

    score = { timeSignature, measureCount, selection, measures: cleanMeasures, firstListedMeasure };
  }

  return { prompt, apiKey, score };
}
