import assert from "node:assert/strict";
import test from "node:test";

import { TEACHER, compileScenePrompt } from "./teacher";

const scene = {
  sceneNumber: 3,
  sceneCount: 12,
  visualAction: "A cloud fills with drops.",
  narration: "Water rises, cools, and falls again.",
  clipDurationSeconds: 5,
};

test("keeps every character-sheet line in the prompt", () => {
  const prompt = compileScenePrompt(scene);
  for (const line of TEACHER.characterSheet) {
    assert.ok(prompt.includes(line), `the prompt lost: ${line}`);
  }
});

test("states the scene position and the clip length", () => {
  assert.ok(compileScenePrompt(scene).includes("5-second 16:9 scene 3 of 12"));
});

test("repeats the voice so it cannot drift between scenes", () => {
  const prompt = compileScenePrompt(scene);
  assert.equal(prompt.split(TEACHER.voice).length - 1, 2);
});

test("drops the trailing full stop of the visual beat", () => {
  assert.ok(compileScenePrompt(scene).includes("Visual beat: A cloud fills with drops."));
});

test("asks for no background music, because the beat is one clip of many", () => {
  assert.ok(compileScenePrompt(scene).includes("No background music"));
});
