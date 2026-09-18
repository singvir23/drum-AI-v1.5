// System prompt and few-shot examples for the notation generator.
// Examples are built programmatically so repetitive patterns cannot contain typos; a test
// asserts that every example measure validates.

import { validateMeasure } from "./notation.js";

export const MAX_MEASURES = 32;

// --- helpers to build example measures -------------------------------------------------------

const hands = (i) => (i % 2 ? "L" : "R");
/** n alternating notes of `code`; `emb(i)` may return embellishment letters for note i. */
export const alt = (n, code, emb = () => "") =>
  Array.from({ length: n }, (_, i) => `${hands(i)}${code}${emb(i)}`).join(" ");
/** Repeat a sticking pattern string ("RLRR LRLL") with a duration code. */
export const pattern = (sticking, code, emb = () => "") =>
  sticking
    .replace(/\s+/g, "")
    .split("")
    .map((h, i) => `${h}${code}${emb(i)}`)
    .join(" ");

// --- examples ----------------------------------------------------------------------------------

/**
 * Each example: { request, score?, output }. `score` is the context the plugin would send
 * (omitted = empty score, no selection). `output` is what the model should return.
 */
export const EXAMPLES = [
  {
    request: "Generate a measure of 16th note single strokes",
    output: { startMeasure: 1, measures: [alt(16, "S")], summary: "One measure of sixteenth-note single strokes in measure 1." },
  },
  {
    request: "quarter note singles",
    output: { startMeasure: 1, measures: [alt(4, "Q")], summary: "Quarter-note single strokes in measure 1." },
  },
  {
    request: "2 measures of 8th note single strokes",
    output: { startMeasure: 1, measures: [alt(8, "E"), alt(8, "E")], summary: "Two measures of eighth-note single strokes in measures 1–2." },
  },
  {
    request: "Create 4 measures of paradiddles",
    output: {
      startMeasure: 1,
      measures: Array(4).fill(pattern("RLRR LRLL RLRR LRLL", "S")),
      summary: "Four measures of sixteenth-note paradiddles (RLRR LRLL) in measures 1–4.",
    },
  },
  {
    request: "16th note singles with an accent every 4 notes",
    output: {
      startMeasure: 1,
      measures: [alt(16, "S", (i) => (i % 4 === 0 ? "X" : ""))],
      summary: "Sixteenth-note single strokes with an accent on the first note of each beat in measure 1.",
    },
  },
  {
    request: "16ths with accents on beats 1 and 3",
    output: {
      startMeasure: 1,
      measures: [alt(16, "S", (i) => (i === 0 || i === 8 ? "X" : ""))],
      summary: "Sixteenth-note single strokes accented on beats 1 and 3 in measure 1.",
    },
  },
  {
    request: "a measure of 16th singles with a flam every 4 notes",
    output: {
      startMeasure: 1,
      measures: [alt(16, "S", (i) => (i % 4 === 0 ? "F" : ""))],
      summary: "Sixteenth-note single strokes with a flam on each beat in measure 1.",
    },
  },
  {
    request: "eighth note triplets for one measure",
    output: { startMeasure: 1, measures: [alt(12, "E3")], summary: "Eighth-note triplet single strokes in measure 1." },
  },
  {
    request: "sixteenth note triplets",
    output: { startMeasure: 1, measures: [alt(24, "S3")], summary: "Sixteenth-note triplet single strokes in measure 1." },
  },
  {
    request: "a measure of eighth note fivelets",
    output: { startMeasure: 1, measures: [alt(20, "E5")], summary: "Eighth-note quintuplet single strokes in measure 1." },
  },
  {
    request: "sevenlets",
    output: { startMeasure: 1, measures: [alt(28, "E7")], summary: "Eighth-note septuplet single strokes in measure 1." },
  },
  {
    request: "8th notes with a diddle every 4 notes",
    output: {
      startMeasure: 1,
      measures: [alt(8, "E", (i) => (i % 4 === 0 ? "D" : ""))],
      summary: "Eighth-note single strokes with a diddle on beats 1 and 3 in measure 1.",
    },
  },
  {
    request: "a measure of five stroke rolls",
    output: {
      startMeasure: 1,
      measures: ["RSD LSD REX LSD RSD LEX RSD LSD REX LSD RSD LEX"],
      summary: "Four five-stroke rolls (two diddled sixteenths into an accented eighth) in measure 1.",
    },
  },
  {
    request: "8th note singles with ghost notes on the upbeats",
    output: {
      startMeasure: 1,
      measures: [alt(8, "E", (i) => (i % 2 ? "G" : ""))],
      summary: "Eighth-note single strokes with ghosted upbeats in measure 1.",
    },
  },
  {
    request: "mixed note values: quarter, eighth and sixteenth notes",
    output: {
      startMeasure: 1,
      measures: ["RQ LE RS LS RS LS RE LQ"],
      summary: "A mixed-rhythm measure of quarter, eighth and sixteenth notes in measure 1.",
    },
  },
  // ---- targeting and editing --------------------------------------------------------------
  {
    request: "make measures 4-6 paradiddles",
    score: { timeSignature: "4/4", measureCount: 8, selection: null, measures: [alt(16, "S"), alt(16, "S"), alt(16, "S"), "", "", "", "", ""] },
    output: {
      startMeasure: 4,
      measures: Array(3).fill(pattern("RLRR LRLL RLRR LRLL", "S")),
      summary: "Sixteenth-note paradiddles in measures 4–6.",
    },
  },
  {
    request: "fill these with 8th note triplets, accent the first of each group",
    score: { timeSignature: "4/4", measureCount: 8, selection: { start: 3, end: 4 }, measures: [alt(16, "S"), alt(16, "S"), "", "", "", "", "", ""] },
    output: {
      startMeasure: 3,
      measures: Array(2).fill(alt(12, "E3", (i) => (i % 3 === 0 ? "X" : ""))),
      summary: "Eighth-note triplets with the first note of each group accented in the selected measures 3–4.",
    },
  },
  {
    request: "4 measures of 16th singles",
    score: { timeSignature: "4/4", measureCount: 8, selection: null, measures: [alt(8, "E"), alt(8, "E"), "", "", "", "", "", ""] },
    output: {
      startMeasure: 3,
      measures: Array(4).fill(alt(16, "S")),
      summary: "Four measures of sixteenth-note single strokes appended after the existing music, in measures 3–6.",
    },
  },
  {
    request: "the last two measures should be quarter note singles with accents",
    score: { timeSignature: "4/4", measureCount: 6, selection: null, measures: [alt(8, "E"), alt(8, "E"), alt(8, "E"), alt(8, "E"), "", ""] },
    output: {
      startMeasure: 5,
      measures: Array(2).fill(alt(4, "Q", () => "X")),
      summary: "Accented quarter-note single strokes in the last two measures, 5–6.",
    },
  },
  {
    request: "add accents to the first note of each triplet",
    score: { timeSignature: "4/4", measureCount: 2, selection: null, measures: [alt(12, "E3"), ""] },
    output: {
      startMeasure: 1,
      measures: [alt(12, "E3", (i) => (i % 3 === 0 ? "X" : ""))],
      summary: "Added an accent to the first note of each triplet in measure 1, keeping the rhythm and sticking.",
    },
  },
  {
    request: "make beats 1 and 2 of measure 2 quintuplets",
    score: { timeSignature: "4/4", measureCount: 2, selection: null, measures: [alt(16, "S"), alt(16, "S")] },
    output: {
      startMeasure: 2,
      measures: [alt(10, "E5") + " " + alt(8, "S")],
      summary: "Beats 1–2 of measure 2 are now eighth-note quintuplets; beats 3–4 keep their sixteenths.",
    },
  },
  {
    request: "remove the flams",
    score: { timeSignature: "4/4", measureCount: 1, selection: null, measures: [alt(16, "S", (i) => (i % 4 === 0 ? "F" : ""))] },
    output: { startMeasure: 1, measures: [alt(16, "S")], summary: "Removed the flams from measure 1; rhythm and sticking unchanged." },
  },
  {
    request: "reverse the sticking in this measure",
    score: { timeSignature: "4/4", measureCount: 3, selection: { start: 2, end: 2 }, measures: [alt(16, "S"), pattern("RLRR LRLL RLRR LRLL", "S"), ""] },
    output: {
      startMeasure: 2,
      measures: [pattern("LRLL RLRR LRLL RLRR", "S")],
      summary: "Swapped every R and L in the selected measure 2.",
    },
  },
  {
    request: "6/8 groove: eighth note singles with accents on 1 and 4",
    score: { timeSignature: "6/8", measureCount: 4, selection: null, measures: ["", "", "", ""] },
    output: {
      startMeasure: 1,
      measures: [alt(6, "E", (i) => (i === 0 || i === 3 ? "X" : ""))],
      summary: "Eighth-note single strokes in 6/8 accented on beats 1 and 4 in measure 1.",
    },
  },
];

// --- system prompt -----------------------------------------------------------------------------

export const SYSTEM_PROMPT = `You are Drum AI Copilot, a snare-drum notation engine inside MuseScore. You turn a drummer's request into snare notation written in a compact token language, and you return JSON only.

# Token language

One token per note. A token is: optional hand (R or L) + duration code + optional embellishment letters.

Duration codes (fraction of a whole note):
  W = whole (1)    H = half (1/2)    Q = quarter (1/4)    E = eighth (1/8)    S = sixteenth (1/16)    T = thirty-second (1/32)
Tuplets: append 3, 5 or 7 to Q, E or S. N notes take the time of 2 plain notes of the same code.
  E3 = 1/12 (3 per beat, 12 per 4/4 bar)     S3 = 1/24 (6 per beat, 24 per bar)     Q3 = 1/6 (3 per half note, 6 per bar)
  E5 = 1/20 (5 per beat, 20 per bar)         S5 = 1/40 (10 per beat)                Q5 = 1/10
  E7 = 1/28 (7 per beat, 28 per bar)         S7 = 1/56 (14 per beat)                Q7 = 1/14
Rests: duration code + R, no hand: QR ER SR E3R.
Embellishments, appended in any order: X accent, F flam (grace note before the stroke), D diddle (the stroke is played as two strokes of the same hand: RED = an eighth diddle), G ghost note (played softly, in parentheses).
Examples: RS  LE3  RQX  LSF  RED  LEG  RSXF

A measure is a space-separated string of tokens. "" (empty string) is a whole-measure rest.

# Hard rules

1. Every measure must add up EXACTLY to the time signature (4/4 = 1 whole note = 16 sixteenths). Count before you answer. Do not pad with extra notes and do not run short; use rests if the music needs them.
2. Tuplet notes come in complete groups: a run of E3 must be a multiple of 3 notes, E5 a multiple of 5, E7 a multiple of 7. Never write 2 triplet notes, 4 quintuplet notes, etc.
3. Every note has a hand. Rests never have a hand or embellishments.
4. Musical conventions: single strokes alternate (R L R L). Paradiddle = RLRR LRLL. Double paradiddle = RLRLRR LRLRLL. Triple paradiddle = RLRLRLRR LRLRLRLL. Paradiddle-diddle = RLRRLL (repeat, or alternate RLRRLL LRLLRR). Double strokes = RRLL. A diddle marks a double stroke on ONE note (RSD is two strokes in the time of one sixteenth); do not also write the second stroke. Five-stroke roll = SD SD E (two diddled sixteenths into an accented eighth, alternating lead hand). Flam tap = RF R LF L (a flammed stroke followed by a tap with the same hand). Flam accent (triplets) = RFX L R LFX R L. "Accent on the beat / on the 1 / downbeats" = the first note of each beat. "Every 4 notes" = notes 1, 5, 9, 13 of a sixteenth bar. Upbeats = the "&" of each beat.
5. Respect the time signature given in the score context (default 4/4). In 6/8, a measure is 6 eighths.
6. Never output more than ${MAX_MEASURES} measures. If asked for more, output ${MAX_MEASURES} and say so in the summary.

# Where the music goes (startMeasure)

You are given the score: its time signature, measure count, the currently selected measure range (if any) and every existing measure's tokens. Decide startMeasure by this priority:
1. Measure numbers named in the request ("measures 4-8", "bar 3", "the first two bars", "the last measure" = measureCount) win.
2. Otherwise a selected range: "these", "this", "the selection", or no location at all → startMeasure = selection start, and write exactly as many measures as are selected unless the request states a different count.
3. Otherwise, if the request states a count ("4 measures of ...") and the score is empty → start at 1. If the score already has music, append: startMeasure = the measure after the last non-empty measure.
4. Otherwise (no count, no location, no selection) → one measure, placed as in rule 3.
It is fine for startMeasure + measures to extend past measureCount; the plugin appends measures.

# Editing existing music

When the request modifies what is already there ("add accents", "remove the flams", "change the sticking", "make beats 1-2 triplets", "double the tempo feel"), start from the existing tokens of the target measures and change ONLY what was asked. Keep every other note's duration, hand and embellishments identical. When the request replaces the music ("make these paradiddles"), write fresh content. A "?" in an existing measure marks notation the plugin cannot express (dotted notes, unusual tuplets); never output "?" — if you must edit such a measure, rewrite it completely.

# Output

Return JSON: { "startMeasure": <int, 1-based>, "measures": [<measure string>, ...], "summary": "<one sentence: what you wrote and in which measures>" }. The measures array replaces measures startMeasure .. startMeasure + length - 1 in order. No prose outside the JSON.`;

// --- message construction ----------------------------------------------------------------------

/** Render the score context the way the model sees it. */
export function describeScore(score) {
  if (!score) return "Score: 4/4, empty (no measures yet). No selection.";
  const ts = score.timeSignature || "4/4";
  const count = score.measureCount ?? (score.measures ? score.measures.length : 0);
  const sel = score.selection ? `Selection: measures ${score.selection.start}–${score.selection.end}.` : "No selection.";
  const lines = [`Score: ${ts}, ${count} measure${count === 1 ? "" : "s"}. ${sel}`];
  const measures = score.measures || [];
  if (measures.length > 0) {
    lines.push('Existing measures ("" = whole-measure rest):');
    const offset = score.firstListedMeasure || 1;
    measures.forEach((m, i) => lines.push(`${offset + i}: ${JSON.stringify(m || "")}`));
    if (score.firstListedMeasure && score.firstListedMeasure > 1) {
      lines.push(`(measures before ${score.firstListedMeasure} not shown)`);
    }
    if (offset + measures.length - 1 < count) lines.push(`(measures ${offset + measures.length}–${count} not shown)`);
  }
  return lines.join("\n");
}

export function userMessage(prompt, score) {
  return `${describeScore(score)}\n\nRequest: ${prompt}`;
}

/** Few-shot examples rendered as prior conversation turns. */
export function exampleTurns() {
  const turns = [];
  for (const ex of EXAMPLES) {
    turns.push({ role: "user", content: userMessage(ex.request, ex.score) });
    turns.push({ role: "assistant", content: JSON.stringify(ex.output) });
  }
  return turns;
}

export function repairMessage(problems, timeSignature) {
  const lines = [`Your JSON had problems (time signature ${timeSignature}). Fix them and return the full corrected JSON with the same startMeasure and the same number of measures:`];
  for (const p of problems) {
    lines.push(`- measures[${p.index}]: ${p.errors.join("; ")}`);
  }
  return lines.join("\n");
}

/** Sanity check used by tests: every example must validate in its own time signature. */
export function invalidExamples() {
  const bad = [];
  EXAMPLES.forEach((ex, i) => {
    const ts = ex.score?.timeSignature || "4/4";
    ex.output.measures.forEach((m, j) => {
      const r = validateMeasure(m, ts);
      if (!r.valid) bad.push({ example: i, request: ex.request, measure: j, errors: r.errors });
    });
  });
  return bad;
}
