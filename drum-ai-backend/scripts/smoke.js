// End-to-end smoke test against a running backend with a real Anthropic key.
//
//   ANTHROPIC_API_KEY=sk-ant-... npm run smoke                 (targets http://localhost:3001)
//   BACKEND_URL=https://drum-ai-backend.vercel.app npm run smoke
//
// Sends a set of representative prompts, prints the results and asserts every returned
// measure validates. Exits non-zero on any failure.

import { validateMeasure } from "../src/notation.js";
import { alt } from "../src/prompt.js";

const url = (process.env.BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("Set ANTHROPIC_API_KEY to run the smoke test.");
  process.exit(2);
}

const filled = (n, m = alt(16, "S")) => Array(n).fill(m);

const CASES = [
  { name: "one measure of 16th singles", prompt: "Generate one measure of 16th note single strokes" },
  { name: "16 measures of paradiddles (no truncation)", prompt: "16 measures of paradiddles", expectMeasures: 16 },
  { name: "32 measures of 16ths (max)", prompt: "32 measures of sixteenth note singles", expectMeasures: 32 },
  { name: "triplets / fivelets / sevenlets", prompt: "3 measures: first eighth-note triplets, second eighth-note fivelets, third eighth-note sevenlets", expectMeasures: 3 },
  {
    name: "edit: add accents to existing triplets",
    prompt: "add accents to the first note of every triplet",
    score: { timeSignature: "4/4", measureCount: 2, selection: null, measures: [alt(12, "E3"), ""] },
    expectStart: 1,
    expect: (r) => r.measures[0].split(" ").filter((t) => t.endsWith("X")).length === 4 && r.measures[0].includes("E3"),
  },
  {
    name: "selection targeting",
    prompt: "make these paradiddles",
    score: { timeSignature: "4/4", measureCount: 8, selection: { start: 3, end: 5 }, measures: [...filled(2), "", "", "", "", "", ""] },
    expectStart: 3,
    expectMeasures: 3,
  },
  {
    name: "explicit measures beyond score length",
    prompt: "put quarter note singles in measures 6-9",
    score: { timeSignature: "4/4", measureCount: 4, selection: null, measures: filled(4) },
    expectStart: 6,
    expectMeasures: 4,
  },
  {
    name: "append after existing music",
    prompt: "2 measures of eighth note singles",
    score: { timeSignature: "4/4", measureCount: 8, selection: null, measures: [...filled(3), "", "", "", "", ""] },
    expectStart: 4,
    expectMeasures: 2,
  },
  {
    name: "6/8",
    prompt: "one measure of eighth notes with accents on 1 and 4",
    score: { timeSignature: "6/8", measureCount: 2, selection: null, measures: ["", ""] },
  },
  { name: "five stroke rolls with diddles", prompt: "a measure of five stroke rolls" },
];

let failures = 0;
for (const c of CASES) {
  const started = Date.now();
  let body;
  try {
    const res = await fetch(`${url}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: c.prompt, apiKey, score: c.score ?? null }),
    });
    body = await res.json();
    if (!res.ok) throw new Error(`${res.status} ${body.error}`);
  } catch (e) {
    failures++;
    console.log(`✗ ${c.name}: ${e.message}`);
    continue;
  }

  const ts = c.score?.timeSignature || "4/4";
  const problems = [];
  body.measures.forEach((m, i) => {
    const v = validateMeasure(m, ts);
    if (!v.valid) problems.push(`measure ${i}: ${v.errors.join("; ")}`);
  });
  if (c.expectStart !== undefined && body.startMeasure !== c.expectStart) problems.push(`startMeasure ${body.startMeasure} != ${c.expectStart}`);
  if (c.expectMeasures !== undefined && body.measures.length !== c.expectMeasures) problems.push(`got ${body.measures.length} measures, expected ${c.expectMeasures}`);
  if (c.expect && !c.expect(body)) problems.push("custom expectation failed");

  const ms = Date.now() - started;
  if (problems.length) {
    failures++;
    console.log(`✗ ${c.name} (${ms}ms)\n    ${problems.join("\n    ")}`);
  } else {
    console.log(`✓ ${c.name} (${ms}ms) start=${body.startMeasure} n=${body.measures.length} warnings=${body.warnings.length}${body.repairedByModel ? " [repair turn]" : ""}`);
  }
  console.log(`    ${body.summary}`);
  console.log(`    ${body.measures[0]}${body.measures.length > 1 ? " …" : ""}`);
  for (const w of body.warnings || []) console.log(`    ⚠ ${w}`);
}

console.log(failures ? `\n${failures} case(s) failed` : "\nall smoke cases passed");
process.exit(failures ? 1 : 0);
