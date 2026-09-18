import { test } from "node:test";
import assert from "node:assert/strict";
import {
  F,
  frac,
  parseToken,
  parseMeasure,
  serializeMeasure,
  validateMeasure,
  validateMeasures,
  repairMeasure,
  chunkUnits,
  codeDuration,
  allDurationCodes,
  parseTimeSignature,
  restsFor,
} from "../src/notation.js";

const rep = (n) => Array(n).fill(null);
const alternate = (n, code, emb = () => "") =>
  rep(n)
    .map((_, i) => `${i % 2 ? "L" : "R"}${code}${emb(i)}`)
    .join(" ");

test("fractions are exact and normalised", () => {
  assert.deepEqual(frac(2, 8), { num: 1, den: 4 });
  assert.deepEqual(F.add(frac(1, 12), frac(1, 12)), { num: 1, den: 6 });
  assert.equal(F.cmp(frac(3, 4), frac(6, 8)), 0);
  assert.equal(F.toString(F.sub(frac(1, 1), frac(15, 16))), "1/16");
});

test("every duration code has the expected value", () => {
  const expected = {
    W: "1/1", H: "1/2", Q: "1/4", E: "1/8", S: "1/16", T: "1/32",
    Q3: "1/6", E3: "1/12", S3: "1/24",
    Q5: "1/10", E5: "1/20", S5: "1/40",
    Q7: "1/14", E7: "1/28", S7: "1/56",
  };
  for (const code of allDurationCodes()) {
    const base = code[0];
    const tuplet = code[1] ? Number(code[1]) : null;
    assert.equal(F.toString(codeDuration(base, tuplet)), expected[code], code);
  }
  assert.equal(allDurationCodes().length, Object.keys(expected).length);
});

test("parseToken accepts the grammar and rejects garbage", () => {
  const ok = (s) => {
    const r = parseToken(s);
    assert.ok(r.ok, `${s}: ${r.error}`);
    return r.token;
  };
  assert.equal(ok("RS").sticking, "R");
  assert.equal(ok("LE3").tuplet, 3);
  assert.deepEqual(ok("RQXF").embellishments, ["X", "F"]);
  assert.deepEqual(ok("RQXX").embellishments, ["X"], "duplicates collapse");
  assert.equal(ok("rs").text, "RS", "case-insensitive");
  assert.equal(ok("ER").rest, true);
  assert.equal(ok("E3R").rest, true);
  assert.equal(ok("E3R").tuplet, 3);
  assert.equal(ok("S").sticking, null, "missing sticking parses; validator complains");

  for (const bad of ["", "R", "RX", "RES", "RQ4", "RT3", "RQR", "QRX", "RQY", "R S", "RQ3R"]) {
    const r = parseToken(bad);
    if (bad === "RQ3R") continue; // rest with tuplet and no sticking is valid: handled below
    assert.equal(r.ok, false, `${bad} should be rejected`);
  }
  assert.equal(parseToken("RQ3R").ok, false, "sticking on a rest is rejected");
  assert.equal(parseToken("Q3R").ok, true);
});

test("measure round-trips through parse and serialize", () => {
  const src = "RSX LS RS RS LSF RS LS LS RQD LE3 RE3 LE3 QR";
  const { tokens, errors } = parseMeasure(src);
  assert.deepEqual(errors, []);
  assert.equal(serializeMeasure(tokens), src);
});

test("parseTimeSignature", () => {
  assert.equal(parseTimeSignature("4/4").text, "4/4");
  assert.equal(F.toString(parseTimeSignature("6/8").capacity), "3/4");
  assert.equal(F.toString(parseTimeSignature(" 3 / 4 ").capacity), "3/4");
  assert.throws(() => parseTimeSignature("4/3"));
  assert.throws(() => parseTimeSignature("nope"));
});

test("valid measures in 4/4", () => {
  const cases = [
    "",
    alternate(16, "S"),
    alternate(8, "E"),
    alternate(4, "Q"),
    "RW",
    "WR",
    alternate(12, "E3"),
    alternate(24, "S3"),
    alternate(20, "E5"),
    alternate(28, "E7"),
    alternate(6, "Q3") ,
    "RE3 LE3 RE3 " + alternate(12, "S"),
    "RQ LE RS LS RS LS RE LQ",
    "RE3 E3R LE3 QR HR",
  ];
  for (const m of cases) {
    const r = validateMeasure(m, "4/4");
    assert.ok(r.valid, `${JSON.stringify(m)}: ${r.errors.join("; ")}`);
  }
});

test("valid measures in other time signatures", () => {
  assert.ok(validateMeasure(alternate(6, "E"), "3/4").valid);
  assert.ok(validateMeasure(alternate(6, "E"), "6/8").valid);
  assert.ok(validateMeasure(alternate(12, "S"), "3/4").valid);
  assert.ok(validateMeasure(alternate(20, "S"), "5/4").valid);
  assert.equal(validateMeasure(alternate(16, "S"), "3/4").valid, false);
});

test("validator reports each error class", () => {
  const errs = (m, ts = "4/4") => validateMeasure(m, ts).errors.join(" | ");

  assert.match(errs(alternate(17, "S")), /too long/);
  assert.match(errs(alternate(15, "S")), /too short/);
  assert.match(errs("RS LS RS LS " + alternate(11, "E3")), /run of 11 E3 notes must be a multiple of 3/);
  assert.match(errs(alternate(19, "E5")), /multiple of 5/);
  assert.match(errs("S LS RS LS " + alternate(12, "S")), /missing sticking/);
  assert.match(errs("RS LS RZ LS " + alternate(12, "S")), /unknown token "RZ"/);
  assert.match(errs("RQR LQ RQ LQ"), /rest must not have sticking/);
  assert.match(errs("RQ3 LQ3 RQ3 LQ3 RQ3 LQ3 " + "RQ LQ"), /too long/);
});

test("validateMeasures lists only the bad ones with their index", () => {
  const problems = validateMeasures([alternate(16, "S"), alternate(15, "S"), "", alternate(4, "E")]);
  assert.deepEqual(problems.map((p) => p.index), [1, 3]);
});

test("chunkUnits groups tuplets by N and flags incomplete runs", () => {
  const { tokens } = parseMeasure("RQ " + alternate(7, "E3") + " " + alternate(5, "E5"));
  const units = chunkUnits(tokens);
  assert.deepEqual(
    units.map((u) => [u.tokens.length, u.tuplet, Boolean(u.incomplete)]),
    [[1, null, false], [3, 3, false], [3, 3, false], [1, 3, true], [5, 5, false]],
  );
});

test("restsFor pads greedily and refuses the impossible", () => {
  assert.deepEqual(restsFor(frac(3, 4)).map((r) => r.base), ["H", "Q"]);
  assert.deepEqual(restsFor(frac(7, 32)).map((r) => r.base), ["E", "S", "T"]);
  assert.equal(restsFor(frac(1, 12)), null);
  assert.deepEqual(restsFor(frac(0, 1)), []);
});

test("repair: overflow is truncated at unit boundaries", () => {
  const r = repairMeasure(alternate(18, "S"));
  assert.ok(validateMeasure(r.measure).valid);
  assert.equal(r.measure, alternate(16, "S"));
  assert.match(r.warnings.join(" "), /longer than 4\/4/);
});

test("repair: a tuplet group that does not fit is dropped whole, then padded", () => {
  const r = repairMeasure(alternate(14, "S") + " RE3 LE3 RE3");
  assert.ok(validateMeasure(r.measure).valid, r.measure);
  assert.equal(r.measure, alternate(14, "S") + " ER");
});

test("repair: underflow is padded largest-first", () => {
  const r = repairMeasure("RQ LQ");
  assert.equal(r.measure, "RQ LQ HR");
  const r2 = repairMeasure(alternate(5, "S"));
  assert.equal(r2.measure, alternate(5, "S") + " HR ER SR");
  assert.ok(validateMeasure(r2.measure).valid);
});

test("repair: incomplete tuplet runs are dropped", () => {
  const r = repairMeasure(alternate(11, "E3"));
  assert.ok(validateMeasure(r.measure).valid, r.measure);
  assert.equal(r.measure, alternate(9, "E3") + " QR");
  assert.match(r.warnings.join(" "), /stray E3/);
});

test("repair: missing sticking alternates from the previous hand", () => {
  const r = repairMeasure("RQ Q Q Q");
  assert.equal(r.measure, "RQ LQ RQ LQ");
  const r2 = repairMeasure("Q Q QR Q");
  assert.equal(r2.measure, "RQ LQ QR RQ");
});

test("repair: unknown tokens are dropped with a warning", () => {
  const r = repairMeasure("RQ banana LQ RQ LQ");
  assert.equal(r.measure, "RQ LQ RQ LQ");
  assert.match(r.warnings[0], /unknown token "banana"/);
});

test("repair: already-valid measures pass through untouched", () => {
  const m = "RSX LS RS RS LSF RS LS LS " + alternate(8, "S");
  const r = repairMeasure(m);
  assert.equal(r.measure, m);
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(repairMeasure(""), { measure: "", warnings: [] });
});

test("repair: works in 6/8", () => {
  const r = repairMeasure(alternate(8, "E"), "6/8");
  assert.equal(r.measure, alternate(6, "E"));
  assert.ok(validateMeasure(r.measure, "6/8").valid);
});
