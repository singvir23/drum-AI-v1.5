// Turn a request into validated notation: call Claude, validate, give it one chance to fix
// its own mistakes, then repair deterministically whatever is still wrong.

import Anthropic from "@anthropic-ai/sdk";
import { validateMeasures, repairMeasure } from "./notation.js";
import { SYSTEM_PROMPT, MAX_MEASURES, exampleTurns, userMessage, repairMessage } from "./prompt.js";
import { OUTPUT_SCHEMA, RequestError, normalizeRequest } from "./schema.js";

export const DEFAULT_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";
const MAX_OUTPUT_TOKENS = 3000;
const REQUEST_TIMEOUT_MS = 55_000;

export function createClient(apiKey) {
  return new Anthropic({ apiKey, maxRetries: 1, timeout: REQUEST_TIMEOUT_MS });
}

/** Map an SDK error to { status, message } for the HTTP layer. */
export function describeClaudeError(err) {
  if (err instanceof RequestError) return { status: err.status, message: err.message };
  if (err instanceof Anthropic.AuthenticationError) return { status: 401, message: "Invalid Anthropic API key." };
  if (err instanceof Anthropic.PermissionDeniedError) return { status: 403, message: "This API key is not allowed to use the model." };
  if (err instanceof Anthropic.RateLimitError) return { status: 429, message: "Anthropic rate limit hit — wait a moment and try again." };
  if (err instanceof Anthropic.BadRequestError) return { status: 400, message: `Claude rejected the request: ${err.message}` };
  if (err instanceof Anthropic.APIConnectionTimeoutError) return { status: 504, message: "Claude took too long to answer. Try fewer measures." };
  if (err instanceof Anthropic.APIError) return { status: 502, message: `Claude API error (${err.status}): ${err.message}` };
  return { status: 500, message: err?.message || "Unexpected server error." };
}

function extractJson(response) {
  const text = (response.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (response.stop_reason === "max_tokens") {
    throw new RequestError("The response was too long. Ask for fewer measures at a time.", 422);
  }
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    throw new RequestError("Claude returned malformed JSON. Please try again.", 502);
  }
}

/**
 * Generate notation.
 * @param {object} body       raw request body from the plugin
 * @param {object} [options]  { client, model, log } — client is injectable for tests
 */
export async function generate(body, options = {}) {
  const { prompt, apiKey, score } = normalizeRequest(body);
  const effectiveKey = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!effectiveKey) throw new RequestError("An Anthropic API key is required. Add it in the plugin's settings.", 401);

  const client = options.client || createClient(effectiveKey);
  const model = options.model || DEFAULT_MODEL;
  const log = options.log || (() => {});
  const timeSignature = score?.timeSignature || "4/4";

  // The system prompt and the few-shot examples are identical on every request, so they are
  // marked as a prompt-cache prefix; only the score context + prompt vary per call.
  const examples = exampleTurns();
  const lastExample = examples[examples.length - 1];
  examples[examples.length - 1] = {
    role: lastExample.role,
    content: [{ type: "text", text: lastExample.content, cache_control: { type: "ephemeral" } }],
  };
  const messages = [...examples, { role: "user", content: userMessage(prompt, score) }];
  const request = {
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages,
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
  };

  log(`generate: model=${model} promptChars=${prompt.length} contextMeasures=${score?.measures.length ?? 0}`);
  const first = await client.messages.create(request);
  let { text, json } = extractJson(first);
  let usage = sumUsage(null, first.usage);
  let result = sanitize(json);
  let problems = validateMeasures(result.measures, timeSignature);
  let repairedByModel = false;

  if (problems.length > 0) {
    log(`generate: ${problems.length} invalid measure(s), asking Claude to fix`);
    const second = await client.messages.create({
      ...request,
      messages: [...messages, { role: "assistant", content: text }, { role: "user", content: repairMessage(problems, timeSignature) }],
    });
    usage = sumUsage(usage, second.usage);
    const fixed = sanitize(extractJson(second).json);
    const fixedProblems = validateMeasures(fixed.measures, timeSignature);
    // Keep whichever attempt has fewer problems; prefer the fix on a tie.
    if (fixedProblems.length <= problems.length) {
      result = fixed;
      problems = fixedProblems;
      repairedByModel = true;
    }
  }

  const warnings = [];
  if (problems.length > 0) {
    log(`generate: ${problems.length} measure(s) still invalid, repairing deterministically`);
    for (const p of problems) {
      const { measure, warnings: w } = repairMeasure(result.measures[p.index], timeSignature);
      result.measures[p.index] = measure;
      const n = result.startMeasure + p.index;
      for (const msg of w) warnings.push(`Measure ${n}: ${msg}`);
    }
  }
  if (result.truncated) warnings.push(`Only the first ${MAX_MEASURES} measures were kept.`);

  return {
    startMeasure: result.startMeasure,
    measures: result.measures,
    summary: result.summary,
    warnings,
    timeSignature,
    model,
    usage,
    repairedByModel,
  };
}

/** Coerce Claude's JSON into a safe shape. */
function sanitize(json) {
  if (!json || typeof json !== "object") throw new RequestError("Claude returned an unexpected structure.", 502);
  let startMeasure = Number.isInteger(json.startMeasure) ? json.startMeasure : Number.parseInt(json.startMeasure, 10);
  if (!Number.isInteger(startMeasure) || startMeasure < 1) startMeasure = 1;

  let measures = Array.isArray(json.measures) ? json.measures.map((m) => (typeof m === "string" ? m.trim() : "")) : [];
  if (measures.length === 0) throw new RequestError("Claude returned no measures. Try rephrasing the request.", 502);
  let truncated = false;
  if (measures.length > MAX_MEASURES) {
    measures = measures.slice(0, MAX_MEASURES);
    truncated = true;
  }

  const summary = typeof json.summary === "string" && json.summary.trim() ? json.summary.trim() : `Wrote ${measures.length} measure(s) starting at measure ${startMeasure}.`;
  return { startMeasure, measures, summary, truncated };
}

function sumUsage(acc, usage) {
  if (!usage) return acc;
  const base = acc || { input_tokens: 0, output_tokens: 0 };
  return {
    input_tokens: base.input_tokens + (usage.input_tokens || 0),
    output_tokens: base.output_tokens + (usage.output_tokens || 0),
  };
}
