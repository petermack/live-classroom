import assert from "node:assert/strict";
import test from "node:test";

import type { LessonPlan } from "@/lib/lesson-plan";
import { concatEntry, resolveFfmpeg, subtitleTrack } from "./stitch";

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

test("writes a Windows path into the concat list with forward slashes", () => {
  assert.equal(
    concatEntry("C:\\Users\\pdmac\\live-classroom\\recordings\\sky-blue\\scene-01.mp4"),
    "file 'C:/Users/pdmac/live-classroom/recordings/sky-blue/scene-01.mp4'",
  );
});

test("keeps a POSIX path as it is", () => {
  assert.equal(concatEntry("/home/user/recordings/sky-blue/scene-01.mp4"),
    "file '/home/user/recordings/sky-blue/scene-01.mp4'");
});

test("escapes a quote in a folder name", () => {
  assert.equal(concatEntry("/home/pat's files/scene-01.mp4"), "file '/home/pat'\\''s files/scene-01.mp4'");
});

test("uses the packaged ffmpeg when its file is really there", () => {
  assert.equal(resolveFfmpeg("/node_modules/ffmpeg-static/ffmpeg", () => true),
    "/node_modules/ffmpeg-static/ffmpeg");
});

test("falls back to an installed ffmpeg when the packaged file is missing", () => {
  assert.equal(resolveFfmpeg("/node_modules/ffmpeg-static/ffmpeg.exe", () => false), "ffmpeg");
  assert.equal(resolveFfmpeg(null), "ffmpeg");
});
