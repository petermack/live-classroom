import assert from "node:assert/strict";
import test from "node:test";

import type { LessonPlan } from "@/lib/lesson-plan";
import { subtitleTrack } from "./stitch";

const plan: LessonPlan = {
  title: "How rain works",
  topic: "the water cycle",
  bigQuestion: null,
  scenes: [
    { number: 1, narration: "The sun heats the sea.", visualAction: "Sun over water", note: null },
    { number: 2, narration: "The water rises as vapour.", visualAction: "Vapour lifts", note: null },
  ],
};

test("writes one subtitle block per scene, on the scene boundary", () => {
  const track = subtitleTrack(plan);
  assert.ok(track.startsWith("1\n00:00:00,200 --> 00:00:04,900\nThe sun heats the sea."));
  assert.ok(track.includes("2\n00:00:05,200 --> 00:00:09,900\nThe water rises as vapour."));
});
