// Compact snare notation: the wire format shared by the backend and the plugin.
//
//   token       = [R|L] DUR [emb...]        e.g. RS  LE3  RQX  RSXF
//   rest        = DUR "R"                   e.g. QR  ER  E3R   (no sticking, no embellishments)
//   DUR         = W | H | Q | E | S | T, optionally followed by a tuplet digit 3 | 5 | 7
//                 (N notes in the time of 2; only Q, E and S may carry a tuplet digit)
//   emb         = X accent | F flam | D diddle | G ghost note   (any order, no duplicates)
//   measure     = tokens separated by whitespace; "" means a whole-measure rest
//
// Everything here is pure and uses exact integer fractions — no floating point.

// ---------------------------------------------------------------------------
// Fractions
// ---------------------------------------------------------------------------

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function frac(num, den = 1) {
  if (!Number.isInteger(num) || !Number.isInteger(den) || den === 0) {
    throw new TypeError(`invalid fraction ${num}/${den}`);
  }
  if (den < 0) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}

export const F = {
  zero: () => frac(0, 1),
  add: (a, b) => frac(a.num * b.den + b.num * a.den, a.den * b.den),
  sub: (a, b) => frac(a.num * b.den - b.num * a.den, a.den * b.den),
  mul: (a, b) => frac(a.num * b.num, a.den * b.den),
  cmp: (a, b) => a.num * b.den - b.num * a.den,
  eq: (a, b) => a.num === b.num && a.den === b.den,
  isZero: (a) => a.num === 0,
  toString: (a) => `${a.num}/${a.den}`,
};

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export const BASE_DURATIONS = {
  W: frac(1, 1),
  H: frac(1, 2),
  Q: frac(1, 4),
  E: frac(1, 8),
  S: frac(1, 16),
  T: frac(1, 32),
};

export const BASE_NAMES = {
  W: "whole",
  H: "half",
  Q: "quarter",
  E: "eighth",
  S: "sixteenth",
  T: "thirty-second",
};

export const TUPLET_NUMBERS = [3, 5, 7];
export const TUPLET_BASES = ["Q", "E", "S"];
export const EMBELLISHMENTS = {
  X: "accent",
  F: "flam",
  D: "diddle",
  G: "ghost note",
};

const TOKEN_RE = /^([RL])?([WHQEST])([357])?(R)?([XFDG]*)$/;

/** Duration (fraction of a whole note) of a duration code such as "E" or "E3". */
export function codeDuration(base, tuplet) {
  const d = BASE_DURATIONS[base];
  if (!d) throw new Error(`unknown base duration ${base}`);
  return tuplet ? F.mul(d, frac(2, tuplet)) : d;
}

/** All valid duration codes, e.g. ["W","H","Q","E","S","T","Q3","E3",...]. */
export function allDurationCodes() {
  const codes = Object.keys(BASE_DURATIONS);
  for (const b of TUPLET_BASES) for (const n of TUPLET_NUMBERS) codes.push(`${b}${n}`);
  return codes;
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

/**
 * Parse one token. Returns { ok: true, token } or { ok: false, error }.
 * A parsed token: { sticking, base, tuplet, rest, embellishments, duration, code, text }.
 */
export function parseToken(raw) {
  const text = String(raw).trim().toUpperCase();
  const m = TOKEN_RE.exec(text);
  if (!m) return { ok: false, error: `unknown token "${raw}"` };

  const [, sticking, base, tupletDigit, restFlag, embText] = m;
  const tuplet = tupletDigit ? Number(tupletDigit) : null;
  const rest = Boolean(restFlag);

  if (tuplet && !TUPLET_BASES.includes(base)) {
    return { ok: false, error: `"${raw}": tuplets are only allowed on Q, E and S notes` };
  }
  if (rest && sticking) {
    return { ok: false, error: `"${raw}": a rest must not have sticking (write ${base}${tupletDigit || ""}R)` };
  }
  if (rest && embText) {
    return { ok: false, error: `"${raw}": a rest must not have embellishments` };
  }

  const embellishments = [...new Set(embText.split("").filter(Boolean))];
  const code = `${base}${tupletDigit || ""}`;
  return {
    ok: true,
    token: {
      sticking: sticking || null,
      base,
      tuplet,
      rest,
      embellishments,
      duration: codeDuration(base, tuplet),
      code,
      text: serializeToken({ sticking: sticking || null, base, tuplet, rest, embellishments }),
    },
  };
}

export function serializeToken(t) {
  const emb = t.rest ? "" : (t.embellishments || []).join("");
  return `${t.rest ? "" : t.sticking || ""}${t.base}${t.tuplet || ""}${t.rest ? "R" : ""}${emb}`;
}

export function serializeMeasure(tokens) {
  return tokens.map(serializeToken).join(" ");
}

/** Split a measure string into raw token strings. */
export function splitMeasure(str) {
  return String(str ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Parse a measure string into tokens. Unparseable tokens are reported in `errors` and skipped. */
export function parseMeasure(str) {
  const tokens = [];
  const errors = [];
  for (const raw of splitMeasure(str)) {
    const r = parseToken(raw);
    if (r.ok) tokens.push(r.token);
    else errors.push(r.error);
  }
  return { tokens, errors };
}

// ---------------------------------------------------------------------------
// Time signatures
// ---------------------------------------------------------------------------

export function parseTimeSignature(ts) {
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(String(ts ?? "4/4"));
  if (!m) throw new Error(`invalid time signature "${ts}"`);
  const num = Number(m[1]);
  const den = Number(m[2]);
  if (num < 1 || num > 64 || ![1, 2, 4, 8, 16, 32].includes(den)) {
    throw new Error(`unsupported time signature "${ts}"`);
  }
  return { num, den, capacity: frac(num, den), text: `${num}/${den}` };
}

// ---------------------------------------------------------------------------
// Units: a tuplet group (N consecutive notes of the same tuplet code) or a single note
// ---------------------------------------------------------------------------

/**
 * Group tokens into units. Consecutive tokens sharing the same tuplet code form runs; each run is
 * split into groups of N. A run whose length is not a multiple of N yields a final unit with
 * `incomplete: true`.
 */
export function chunkUnits(tokens) {
  const units = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (!t.tuplet) {
      units.push({ tokens: [t], tuplet: null, start: i, duration: t.duration });
      i += 1;
      continue;
    }
    let j = i;
    while (j < tokens.length && tokens[j].code === t.code) j += 1;
    const run = tokens.slice(i, j);
    for (let k = 0; k < run.length; k += t.tuplet) {
      const group = run.slice(k, k + t.tuplet);
      units.push({
        tokens: group,
        tuplet: t.tuplet,
        code: t.code,
        start: i + k,
        incomplete: group.length !== t.tuplet,
        runLength: run.length,
        duration: group.reduce((acc, g) => F.add(acc, g.duration), F.zero()),
      });
    }
    i = j;
  }
  return units;
}

export function measureDuration(tokens) {
  return tokens.reduce((acc, t) => F.add(acc, t.duration), F.zero());
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate one measure string against a time signature.
 * Returns { valid, errors, tokens, total }. An empty string is a valid whole-measure rest.
 */
export function validateMeasure(str, timeSignature = "4/4") {
  const ts = parseTimeSignature(timeSignature);
  const { tokens, errors } = parseMeasure(str);

  if (splitMeasure(str).length === 0) {
    return { valid: true, errors: [], tokens: [], total: F.zero(), empty: true };
  }

  for (const t of tokens) {
    if (!t.rest && !t.sticking) errors.push(`"${t.text}" is missing sticking (prefix R or L)`);
  }

  // Only the last group of a run can be incomplete, so this yields one error per bad run.
  for (const u of chunkUnits(tokens)) {
    if (u.incomplete) {
      errors.push(
        `run of ${u.runLength} ${u.code} notes must be a multiple of ${u.tuplet} (tuplet groups of ${u.tuplet})`,
      );
    }
  }

  const total = measureDuration(tokens);
  const cmp = F.cmp(total, ts.capacity);
  if (cmp !== 0) {
    errors.push(
      `measure adds up to ${F.toString(total)} of a whole note but ${ts.text} needs exactly ${F.toString(ts.capacity)} (${cmp > 0 ? "too long" : "too short"})`,
    );
  }

  return { valid: errors.length === 0, errors, tokens, total, empty: false };
}

/** Validate a list of measure strings. Returns [{ index, errors }] for the invalid ones. */
export function validateMeasures(measures, timeSignature = "4/4") {
  const problems = [];
  measures.forEach((m, index) => {
    const r = validateMeasure(m, timeSignature);
    if (!r.valid) problems.push({ index, errors: r.errors });
  });
  return problems;
}

// ---------------------------------------------------------------------------
// Repair
// ---------------------------------------------------------------------------

const REST_ORDER = ["W", "H", "Q", "E", "S", "T"];

/** Greedy rests, largest first, that exactly fill `remaining`. Returns null if impossible. */
export function restsFor(remaining) {
  const out = [];
  let left = remaining;
  for (const base of REST_ORDER) {
    const d = BASE_DURATIONS[base];
    while (F.cmp(left, d) >= 0) {
      out.push({ sticking: null, base, tuplet: null, rest: true, embellishments: [], duration: d, code: base });
      left = F.sub(left, d);
    }
  }
  return F.isZero(left) ? out : null;
}

/**
 * Deterministically turn any measure string into a valid one.
 * Returns { measure, warnings }. Never throws for string input.
 */
export function repairMeasure(str, timeSignature = "4/4") {
  const ts = parseTimeSignature(timeSignature);
  const warnings = [];
  const { tokens: parsed, errors } = parseMeasure(str);
  for (const e of errors) warnings.push(`dropped ${e}`);

  if (parsed.length === 0) return { measure: "", warnings };

  // Fill missing sticking by alternating from the previous hand.
  let lastHand = "L";
  const tokens = parsed.map((t) => {
    if (t.rest) return t;
    if (!t.sticking) {
      const hand = lastHand === "R" ? "L" : "R";
      warnings.push(`"${t.text}" had no sticking; used ${hand}`);
      t = { ...t, sticking: hand };
    }
    lastHand = t.sticking;
    return t;
  });

  // Drop incomplete tuplet groups, then keep whole units while they fit.
  const units = chunkUnits(tokens).filter((u) => {
    if (u.incomplete) {
      warnings.push(`dropped ${u.tokens.length} stray ${u.code} note(s) that did not complete a group of ${u.tuplet}`);
      return false;
    }
    return true;
  });

  let kept = [];
  let total = F.zero();
  let truncated = false;
  for (const u of units) {
    const next = F.add(total, u.duration);
    if (F.cmp(next, ts.capacity) > 0) {
      truncated = true;
      break;
    }
    kept = kept.concat(u.tokens);
    total = next;
  }
  if (truncated) warnings.push(`measure was longer than ${ts.text}; extra notes were removed`);

  // Pad the remainder with rests. If the remainder is not expressible, back off one unit at a time.
  let remaining = F.sub(ts.capacity, total);
  let rests = restsFor(remaining);
  while (rests === null && kept.length > 0) {
    const lastUnit = chunkUnits(kept).pop();
    kept = kept.slice(0, kept.length - lastUnit.tokens.length);
    total = measureDuration(kept);
    remaining = F.sub(ts.capacity, total);
    rests = restsFor(remaining);
  }
  if (rests === null) return { measure: "", warnings: [...warnings, "measure could not be repaired; replaced with a whole rest"] };
  if (rests.length > 0 && !truncated) {
    warnings.push(`measure was shorter than ${ts.text}; padded with ${rests.map((r) => BASE_NAMES[r.base] + " rest").join(", ")}`);
  } else if (rests.length > 0) {
    warnings.push(`padded with ${rests.map((r) => BASE_NAMES[r.base] + " rest").join(", ")}`);
  }

  const measure = serializeMeasure([...kept, ...rests]);
  return { measure, warnings };
}
