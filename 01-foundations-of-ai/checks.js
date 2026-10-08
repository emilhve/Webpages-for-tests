"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const courseDir = __dirname;
const sourceText = fs.readFileSync(path.join(courseDir, "..", "Source-material", "README.md"), "utf8");
const sourceMatch = sourceText.match(/```json\s*([\s\S]*?)\s*```/);
assert(sourceMatch, "Embedded source JSON was not found");
const sourceBank = JSON.parse(sourceMatch[1]);

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(courseDir, "question-data.js"), "utf8"), context);
const bank = JSON.parse(JSON.stringify(context.window.QUIZ_DATA));

assert.deepEqual(bank, sourceBank, "Extracted data must match the supplied JSON exactly");
assert.equal(bank.questions.length, 64, "There must be exactly 64 questions");
assert.equal(new Set(bank.questions.map((question) => question.id)).size, 64, "Question IDs must be unique");

const expectedIds = Array.from({ length: 64 }, (_, index) => `Q${String(index + 1).padStart(2, "0")}`);
assert.deepEqual(bank.questions.map((question) => question.id), expectedIds, "IDs must run from Q01 through Q64");

function parseNumeric(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return { kind: "empty" };
  if (!/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(value)) return { kind: "invalid" };
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? { kind: "number", value: number } : { kind: "invalid" };
}

function grade(question, response) {
  if (question.type === "single-choice") return Boolean(response) && response === question.answer;
  const parsed = parseNumeric(response);
  return parsed.kind === "number" && Math.abs(parsed.value - question.answer) <= question.tolerance;
}

for (const question of bank.questions) {
  assert.notEqual(question.answer, undefined, `${question.id} needs an answer`);
  assert(question.explanation, `${question.id} needs an explanation`);
  if (question.type === "single-choice") {
    assert(question.options.some((option) => option.id === question.answer), `${question.id} answer must match an option`);
    assert.equal(grade(question, question.answer), true, `${question.id} correct choice should pass`);
    assert.equal(grade(question, ""), false, `${question.id} blank choice should fail`);
    const wrong = question.options.find((option) => option.id !== question.answer).id;
    assert.equal(grade(question, wrong), false, `${question.id} incorrect choice should fail`);
  } else if (question.type === "numeric") {
    assert.equal(typeof question.tolerance, "number", `${question.id} needs tolerance`);
    assert.equal(grade(question, String(question.answer)), true, `${question.id} exact answer should pass`);
    assert.equal(grade(question, String(question.answer).replace(".", ",")), true, `${question.id} decimal comma should pass`);
    assert.equal(grade(question, ""), false, `${question.id} blank numeric answer should fail`);
    assert.equal(grade(question, `${question.answer}xyz`), false, `${question.id} partial numeric string should fail`);
    assert.equal(grade(question, String(question.answer + question.tolerance + 1)), false, `${question.id} wrong numeric answer should fail`);
  } else {
    assert(Array.isArray(question.keyPoints) && question.keyPoints.length, `${question.id} needs a checklist`);
  }
}

assert.equal(parseNumeric("2,5").value, 2.5);
assert.equal(parseNumeric("2.5").value, 2.5);
assert.equal(parseNumeric("2xyz").kind, "invalid");
assert.equal(parseNumeric("Infinity").kind, "invalid");
assert.equal(parseNumeric("").kind, "empty");

function seededShuffle(items, seed) {
  const result = [...items];
  let value = seed >>> 0;
  const random = () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

const ids = bank.questions.map((question) => question.id);
const shuffledA = seededShuffle(ids, 123456);
const shuffledB = seededShuffle(ids, 123456);
assert.deepEqual(shuffledA, shuffledB, "A seed must produce a stable order");
assert.deepEqual([...shuffledA].sort(), [...ids].sort(), "Shuffle must retain every ID");

const savedState = {
  version: 1,
  sessionId: "check-session",
  phase: "session",
  order: shuffledA.slice(0, 10),
  responses: { [shuffledA[0]]: "sample" },
  flags: { [shuffledA[1]]: true },
  assessments: { [shuffledA[2]]: "partial" }
};
assert.deepEqual(JSON.parse(JSON.stringify(savedState)), savedState, "Progress state must round-trip through JSON");

console.log("All checks passed: 64 exact questions, grading contracts, shuffle stability, and persistence shape.");
