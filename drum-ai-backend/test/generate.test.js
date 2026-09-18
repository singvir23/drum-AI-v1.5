import { test } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { generate, describeApiError } from "../src/generate.js";
import { EXAMPLES, invalidExamples, describeScore, alt, pattern } from "../src/prompt.js";
import { normalizeRequest, RequestError } from "../src/schema.js";
import { validateMeasure } from "../src/notation.js";

/** A fake Anthropic client that returns the given JSON payloads in order and records calls. */
function stubClient(...payloads) {
  const calls = [];
  return {
    calls,
    messages: {
      async create(req) {
        calls.push(req);
        const payload = payloads.shift();
        if (payload instanceof Error) throw payload;
        const text = typeof payload === "string" ? payload : JSON.stringify(payload);
        return {
          stop_reason: payload?.stop_reason || "end_turn",
          content: [{ type: "text", text }],
          usage: { input_tokens: 100, output_tokens: 20 },
        };
      },
    },
  };
}

test("every few-shot example validates in its own time signature", () => {
  assert.deepEqual(invalidExamples(), []);
  assert.ok(EXAMPLES.length >= 20);
});

test("describeScore renders context the model can read", () => {
  const text = describeScore({ timeSignature: "4/4", measureCount: 4, selection: { start: 2, end: 3 }, measures: ["RQ LQ RQ LQ", "", "", ""] });
  assert.match(text, /Score: 4\/4, 4 measures\. Selection: measures 2–3\./);
  assert.match(text, /1: "RQ LQ RQ LQ"/);
  assert.match(text, /2: ""/);
  assert.equal(describeScore(null), "Score: 4/4, empty (no measures yet). No selection.");
  const windowed = describeScore({ timeSignature: "4/4", measureCount: 100, selection: null, measures: ["", ""], firstListedMeasure: 40 });
  assert.match(windowed, /40: ""/);
  assert.match(windowed, /measures before 40 not shown/);
  assert.match(windowed, /measures 42–100 not shown/);
});

test("normalizeRequest accepts a full request and rejects bad ones", () => {
  const r = normalizeRequest({
    prompt: "  4 bars of singles ",
    apiKey: "sk-test",
    score: { timeSignature: "3/4", measureCount: 8, selection: { start: 2, end: 4 }, measures: ["RQ LQ RQ", null] },
  });
  assert.equal(r.prompt, "4 bars of singles");
  assert.equal(r.score.timeSignature, "3/4");
  assert.deepEqual(r.score.measures, ["RQ LQ RQ", ""]);
  assert.deepEqual(r.score.selection, { start: 2, end: 4 });

  assert.equal(normalizeRequest({ prompt: "x" }).score, null);
  assert.throws(() => normalizeRequest({}), RequestError);
  assert.throws(() => normalizeRequest({ prompt: "   " }), /Prompt is required/);
  assert.throws(() => normalizeRequest({ prompt: "x", score: { timeSignature: "9/5" } }), /time signature/);
  assert.throws(() => normalizeRequest({ prompt: "x", score: { selection: { start: 3, end: 2 } } }), /selection/);
  assert.throws(() => normalizeRequest({ prompt: "x", score: { measures: [42] } }), /must be a string/);
});

test("generate: happy path passes validated output straight through", async () => {
  const client = stubClient({ startMeasure: 1, measures: [alt(16, "S")], summary: "Singles." });
  const out = await generate({ prompt: "16th singles", apiKey: "k" }, { client, model: "test-model" });
  assert.equal(out.startMeasure, 1);
  assert.deepEqual(out.measures, [alt(16, "S")]);
  assert.equal(out.summary, "Singles.");
  assert.deepEqual(out.warnings, []);
  assert.equal(out.repairedByModel, false);
  assert.equal(client.calls.length, 1);

  const req = client.calls[0];
  assert.equal(req.model, "test-model");
  assert.equal(req.output_config.format.type, "json_schema");
  assert.ok(req.system[0].text.includes("Token language"));
  assert.deepEqual(req.system[0].cache_control, { type: "ephemeral" });
  assert.equal(req.messages.at(-1).role, "user");
  assert.match(req.messages.at(-1).content, /Request: 16th singles/);
  assert.equal(req.messages.length, EXAMPLES.length * 2 + 1);
  const lastExample = req.messages.at(-2);
  assert.equal(lastExample.role, "assistant");
  assert.deepEqual(lastExample.content[0].cache_control, { type: "ephemeral" }, "examples are a cached prefix");
});

test("generate: invalid measure triggers one repair turn, which is accepted when better", async () => {
  const bad = { startMeasure: 2, measures: [alt(15, "S")], summary: "oops" };
  const good = { startMeasure: 2, measures: [alt(16, "S")], summary: "fixed" };
  const client = stubClient(bad, good);
  const out = await generate({ prompt: "singles", apiKey: "k" }, { client });
  assert.equal(client.calls.length, 2);
  assert.deepEqual(out.measures, [alt(16, "S")]);
  assert.equal(out.repairedByModel, true);
  assert.deepEqual(out.warnings, []);

  const repairTurn = client.calls[1].messages;
  assert.equal(repairTurn.at(-2).role, "assistant");
  assert.equal(repairTurn.at(-1).role, "user");
  assert.match(repairTurn.at(-1).content, /measures\[0\].*too short/);
  assert.equal(out.usage.input_tokens, 200);
});

test("generate: if the model's fix is still bad, deterministic repair kicks in with warnings", async () => {
  const bad = { startMeasure: 3, measures: [alt(16, "S"), alt(18, "S")], summary: "s" };
  const client = stubClient(bad, bad);
  const out = await generate({ prompt: "x", apiKey: "k" }, { client });
  assert.equal(client.calls.length, 2);
  assert.ok(validateMeasure(out.measures[1]).valid);
  assert.equal(out.measures[1], alt(16, "S"));
  assert.equal(out.measures[0], alt(16, "S"));
  assert.equal(out.warnings.length, 1);
  assert.match(out.warnings[0], /^Measure 4: /);
});

test("generate: a worse 'fix' is discarded in favour of the first attempt", async () => {
  const first = { startMeasure: 1, measures: [alt(16, "S"), alt(15, "S")], summary: "a" };
  const worse = { startMeasure: 1, measures: [alt(15, "S"), alt(15, "S")], summary: "b" };
  const client = stubClient(first, worse);
  const out = await generate({ prompt: "x", apiKey: "k" }, { client });
  assert.equal(out.summary, "a");
  assert.equal(out.repairedByModel, false);
  assert.ok(out.measures.every((m) => validateMeasure(m).valid));
});

test("generate: uses the score's time signature for validation", async () => {
  const client = stubClient({ startMeasure: 1, measures: [alt(6, "E")], summary: "6/8" });
  const out = await generate({ prompt: "x", apiKey: "k", score: { timeSignature: "6/8", measures: [""] } }, { client });
  assert.equal(client.calls.length, 1, "6 eighths is valid in 6/8, so no repair turn");
  assert.equal(out.timeSignature, "6/8");
});

test("generate: sanitises startMeasure, trims to 32 measures, defaults summary", async () => {
  const client = stubClient({ startMeasure: 0, measures: Array(40).fill(alt(4, "Q")), summary: "" });
  const out = await generate({ prompt: "x", apiKey: "k" }, { client });
  assert.equal(out.startMeasure, 1);
  assert.equal(out.measures.length, 32);
  assert.match(out.summary, /Wrote 32 measure/);
  assert.match(out.warnings.join(" "), /first 32 measures/);
});

test("generate: max_tokens stop and malformed JSON become clean errors", async () => {
  await assert.rejects(
    generate({ prompt: "x", apiKey: "k" }, { client: stubClient({ startMeasure: 1, measures: ["RQ"], summary: "", stop_reason: "max_tokens" }) }),
    /too long/,
  );
  await assert.rejects(generate({ prompt: "x", apiKey: "k" }, { client: stubClient("{not json") }), /malformed JSON/);
  await assert.rejects(generate({ prompt: "x", apiKey: "k" }, { client: stubClient({ startMeasure: 1, measures: [], summary: "" }) }), /no measures/);
});

test("generate: missing API key is a 401 before any model call", async () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const client = stubClient();
    await assert.rejects(generate({ prompt: "x" }, { client }), (e) => e.status === 401);
    assert.equal(client.calls.length, 0);
  } finally {
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
  }
});

test("describeApiError maps SDK errors to HTTP statuses", () => {
  const mk = (Cls, status) => new Cls(status, { error: { message: "m" } }, "m", new Headers());
  assert.equal(describeApiError(mk(Anthropic.AuthenticationError, 401)).status, 401);
  assert.equal(describeApiError(mk(Anthropic.RateLimitError, 429)).status, 429);
  assert.equal(describeApiError(mk(Anthropic.BadRequestError, 400)).status, 400);
  assert.equal(describeApiError(mk(Anthropic.InternalServerError, 500)).status, 502);
  assert.equal(describeApiError(new Anthropic.APIConnectionTimeoutError()).status, 504);
  assert.equal(describeApiError(new RequestError("bad", 422)).status, 422);
  assert.equal(describeApiError(new Error("boom")).status, 500);
});

test("pattern helper spells rudiments correctly", () => {
  assert.equal(pattern("RLRR LRLL", "S"), "RS LS RS RS LS RS LS LS");
});
