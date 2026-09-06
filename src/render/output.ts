import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

import type { LessonPlan } from "@/lib/lesson-plan";
import { RENDER_CONFIG } from "@/lib/render-config";
import type { RenderTimings } from "@/render/fal";

export const RECORDINGS_ROOT = join(process.cwd(), "recordings");

export type SceneRecord = Readonly<{
  sceneNumber: number;
  narration: string;
  visualAction: string;
  prompt: string;
  expandedPrompt: string | null;
  sourceUrl: string;
  timings: RenderTimings;
  savedAt: string;
}>;

export type LessonManifest = Readonly<{
  slug: string;
  title: string;
  topic: string;
  bigQuestion: string | null;
  sceneCount: number;
  clipDurationSeconds: number;
  durationSeconds: number;
  scenes: readonly Readonly<{ sceneNumber: number; file: string; narration: string }>[];
  renderedAt: string;
  spentCents: number;
  video: string | null;
}>;

export function lessonDirectory(slug: string): string {
  return join(RECORDINGS_ROOT, slug);
}

function stem(slug: string, sceneNumber: number): string {
  return join(lessonDirectory(slug), `scene-${String(sceneNumber).padStart(2, "0")}`);
}

export function sceneVideoPath(slug: string, sceneNumber: number): string {
  return `${stem(slug, sceneNumber)}.mp4`;
}

export function sceneIsRendered(slug: string, sceneNumber: number): boolean {
  return existsSync(sceneVideoPath(slug, sceneNumber));
}

export async function ensureLessonDirectory(slug: string): Promise<string> {
  const directory = lessonDirectory(slug);
  await mkdir(directory, { recursive: true });
  return directory;
}

export async function writeScenePrompt(input: {
  slug: string;
  sceneNumber: number;
  prompt: string;
}): Promise<string> {
  await ensureLessonDirectory(input.slug);
  const path = `${stem(input.slug, input.sceneNumber)}.prompt.txt`;
  await writeFile(path, `${input.prompt}\n`);
  return path;
}

// The clip is downloaded before the scene JSON is written, so a scene file on disk always has
// its video beside it. A half-saved scene is re-rendered on the next run.
export async function saveScene(input: {
  slug: string;
  record: SceneRecord;
}): Promise<void> {
  await ensureLessonDirectory(input.slug);
  const response = await fetch(input.record.sourceUrl, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) {
    throw new Error(`The clip for scene ${input.record.sceneNumber} could not be downloaded`);
  }
  await writeFile(
    sceneVideoPath(input.slug, input.record.sceneNumber),
    Buffer.from(await response.arrayBuffer()),
  );
  await writeFile(
    `${stem(input.slug, input.record.sceneNumber)}.json`,
    `${JSON.stringify(input.record, null, 2)}\n`,
  );
}

export async function readSceneRecord(
  slug: string,
  sceneNumber: number,
): Promise<SceneRecord | null> {
  try {
    const raw = await readFile(`${stem(slug, sceneNumber)}.json`, "utf8");
    return JSON.parse(raw) as SceneRecord;
  } catch {
    return null;
  }
}

export async function writeManifest(input: {
  slug: string;
  plan: LessonPlan;
  spentCents: number;
  video: string | null;
}): Promise<LessonManifest> {
  const manifest: LessonManifest = {
    slug: input.slug,
    title: input.plan.title,
    topic: input.plan.topic,
    bigQuestion: input.plan.bigQuestion,
    sceneCount: input.plan.scenes.length,
    clipDurationSeconds: RENDER_CONFIG.clipDurationSeconds,
    durationSeconds: input.plan.scenes.length * RENDER_CONFIG.clipDurationSeconds,
    scenes: input.plan.scenes.map((scene) => ({
      sceneNumber: scene.number,
      file: `scene-${String(scene.number).padStart(2, "0")}.mp4`,
      narration: scene.narration,
    })),
    renderedAt: new Date().toISOString(),
    spentCents: input.spentCents,
    video: input.video,
  };
  await ensureLessonDirectory(input.slug);
  await writeFile(
    join(lessonDirectory(input.slug), "lesson.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return manifest;
}
