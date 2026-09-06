import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import ffmpegPath from "ffmpeg-static";

import { RENDER_CONFIG } from "@/lib/render-config";
import type { LessonPlan } from "@/lib/lesson-plan";
import { lessonDirectory, sceneVideoPath } from "@/render/output";

function run(args: readonly string[]): Promise<{ ok: boolean; output: string }> {
  const binary = ffmpegPath;
  if (!binary) {
    return Promise.resolve({ ok: false, output: "ffmpeg-static did not supply a binary" });
  }
  return new Promise((resolve) => {
    const child = spawn(binary, [...args], { stdio: ["ignore", "pipe", "pipe"] as const });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.on("error", (error: Error) => resolve({ ok: false, output: error.message }));
    child.on("close", (code: number | null) => resolve({ ok: code === 0, output }));
  });
}

function secondsToTimecode(seconds: number): string {
  const whole = Math.floor(seconds);
  const hours = String(Math.floor(whole / 3_600)).padStart(2, "0");
  const minutes = String(Math.floor((whole % 3_600) / 60)).padStart(2, "0");
  const rest = String(whole % 60).padStart(2, "0");
  const milliseconds = String(Math.round((seconds - whole) * 1_000)).padStart(3, "0");
  return `${hours}:${minutes}:${rest},${milliseconds}`;
}

// One subtitle block per scene. Each clip is exactly one narration line, so the timing is the
// scene boundary and needs no speech alignment.
export function subtitleTrack(plan: LessonPlan): string {
  const clip = RENDER_CONFIG.clipDurationSeconds;
  return plan.scenes
    .map((scene, index) => {
      const start = index * clip + 0.2;
      const end = (index + 1) * clip - 0.1;
      return `${index + 1}\n${secondsToTimecode(start)} --> ${secondsToTimecode(end)}\n${scene.narration}\n`;
    })
    .join("\n");
}

export async function writeSubtitles(slug: string, plan: LessonPlan): Promise<string> {
  const path = join(lessonDirectory(slug), "lesson.srt");
  await writeFile(path, subtitleTrack(plan));
  return path;
}

// ffmpeg's concat list treats a backslash as an escape character, so a Windows path breaks it.
// ffmpeg reads a forward-slash path on every platform, Windows included.
export function concatEntry(videoPath: string): string {
  return `file '${videoPath.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`;
}

export type StitchResult =
  | Readonly<{ ok: true; path: string; reEncoded: boolean }>
  | Readonly<{ ok: false; message: string }>;

export async function stitchLesson(input: {
  slug: string;
  plan: LessonPlan;
}): Promise<StitchResult> {
  const directory = lessonDirectory(input.slug);
  const listPath = join(directory, "concat.txt");
  const outputPath = join(directory, "lesson.mp4");
  const list = input.plan.scenes
    .map((scene) => concatEntry(sceneVideoPath(input.slug, scene.number)))
    .join("\n");
  await writeFile(listPath, `${list}\n`);

  // Every clip comes from the same fal endpoint, so the streams match and a copy is enough.
  // A re-encode is the fallback for a clip that fal produced with different settings.
  const copy = await run(["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outputPath]);
  if (copy.ok) return { ok: true, path: outputPath, reEncoded: false };

  const encode = await run([
    "-y", "-f", "concat", "-safe", "0", "-i", listPath,
    "-c:v", "libx264", "-preset", "medium", "-crf", "20",
    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart",
    outputPath,
  ]);
  if (encode.ok) return { ok: true, path: outputPath, reEncoded: true };
  return { ok: false, message: encode.output.trim().split("\n").slice(-3).join(" ") };
}
