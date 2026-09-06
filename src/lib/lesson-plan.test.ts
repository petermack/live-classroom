import assert from "node:assert/strict";
import test from "node:test";

import { parseLessonPlan } from "./lesson-plan";

function planWith(scenes: readonly Record<string, unknown>[]): Record<string, unknown> {
  return { title: "How rain works", topic: "the water cycle", scenes };
}

const goodScene = { narration: "Water rises, cools, and falls again.", visualAction: "A cloud fills with drops" };

test("accepts a minimal plan and numbers the scenes", () => {
  const result = parseLessonPlan(planWith([goodScene, { ...goodScene, narration: "The sun heats the sea." }]));
  assert.deepEqual(result.errors, []);
  assert.equal(result.plan?.scenes.length, 2);
  assert.equal(result.plan?.scenes[1]?.number, 2);
});

test("rejects a plan with no scenes", () => {
  const result = parseLessonPlan({ title: "A", topic: "B", scenes: [] });
  assert.equal(result.plan, null);
  assert.ok(result.errors.some((error) => error.includes("non-empty array")));
});

test("rejects a missing title", () => {
  const result = parseLessonPlan({ topic: "B", scenes: [goodScene] });
  assert.equal(result.plan, null);
  assert.ok(result.errors.some((error) => error.includes("title")));
});

test("rejects narration that cannot be spoken inside one clip", () => {
  const result = parseLessonPlan(
    planWith([{ ...goodScene, narration: Array.from({ length: 40 }, () => "word").join(" ") }]),
  );
  assert.equal(result.plan, null);
  assert.ok(result.errors.some((error) => error.includes("narration is 40 words")));
});

test("warns about narration that is long but speakable", () => {
  const result = parseLessonPlan(
    planWith([{ ...goodScene, narration: Array.from({ length: 16 }, () => "word").join(" ") }]),
  );
  assert.ok(result.plan);
  assert.ok(result.warnings.some((warning) => warning.includes("16 words")));
});

test("rejects narration that says the teacher's own name", () => {
  const result = parseLessonPlan(planWith([{ ...goodScene, narration: "Wally will show you the rain." }]));
  assert.equal(result.plan, null);
  assert.ok(result.errors.some((error) => error.includes("own name")));
});

test("rejects a repeated narration line", () => {
  const result = parseLessonPlan(planWith([goodScene, { ...goodScene, visualAction: "A different shot" }]));
  assert.equal(result.plan, null);
  assert.ok(result.errors.some((error) => error.includes("repeats scene 1")));
});

test("warns about a repeated visual action", () => {
  const result = parseLessonPlan(
    planWith([goodScene, { ...goodScene, narration: "Now the drops grow heavy." }]),
  );
  assert.ok(result.plan);
  assert.ok(result.warnings.some((warning) => warning.includes("visualAction repeats scene 1")));
});

test("rejects a plan that is not an object", () => {
  assert.equal(parseLessonPlan("nope").plan, null);
});
