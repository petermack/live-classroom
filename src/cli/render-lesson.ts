// Renders one lesson plan into video. Read docs/lesson-plan-authoring.md for the plan format.
//
//   npm run render -- lessons/<name>.json [options]
//
//   --dry-run        Write the compiled prompt for every scene. Calls nothing and spends nothing.
//   --scenes 1,4-6   Work on these scenes only. Use --scenes 1 to approve the look before you buy the rest.
//   --force          Render a scene again even when its clip is already on disk. This spends money again.
//   --join-only      Join the clips that are already on disk. Spends nothing.
//   --yes            Do not ask for confirmation before spending.
//   --out <slug>     Write to recordings/<slug>/ instead of the plan file name.
import { createInterface } from "node:readline/promises";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import process from "node:process";

import { parseRenderArgs } from "@/cli/args";
import { lessonDurationSeconds, parseLessonPlan, type LessonPlan } from "@/lib/lesson-plan";
import { RENDER_CONFIG } from "@/lib/render-config";
import {
  ensureLessonDirectory,
  lessonDirectory,
  sceneIsRendered,
  writeManifest,
  writeScenePrompt,
} from "@/render/output";
import { renderScenes, scenePrompt, type RenderEvent } from "@/render/pipeline";
import { stitchLesson, writeSubtitles } from "@/render/stitch";

function say(line: string): void {
  process.stdout.write(`${line}\n`);
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function fail(message: string): never {
  process.stderr.write(`✗ ${message}\n`);
  process.exit(1);
}

async function loadPlan(planPath: string): Promise<LessonPlan> {
  let raw: string;
  try {
    raw = await readFile(resolve(planPath), "utf8");
  } catch {
    return fail(`${planPath} could not be read`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return fail(`${planPath} is not valid JSON: ${error instanceof Error ? error.message : "unknown"}`);
  }
  const result = parseLessonPlan(parsed);
  for (const warning of result.warnings) say(`  ! ${warning}`);
  if (!result.plan) {
    for (const error of result.errors) process.stderr.write(`  ✗ ${error}\n`);
    return fail(`${planPath} is not a usable lesson plan`);
  }
  return result.plan;
}

async function confirm(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const reader = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await reader.question(`${question} [y/N] `);
  reader.close();
  return answer.trim().toLowerCase() === "y";
}

function report(event: RenderEvent): void {
  if (event.kind === "started") say(`  → scene ${event.sceneNumber} rendering`);
  if (event.kind === "rendered") say(`  ✓ scene ${event.sceneNumber} saved in ${event.seconds.toFixed(0)}s`);
  if (event.kind === "retrying") say(`  … scene ${event.sceneNumber} retrying: ${event.message}`);
  if (event.kind === "failed") say(`  ✗ scene ${event.sceneNumber} failed: ${event.message}`);
  if (event.kind === "ceiling") say(`  ✗ the spend ceiling stopped this run at ${money(event.spentCents)}`);
}

async function finish(slug: string, plan: LessonPlan, spentCents: number): Promise<void> {
  const missing = plan.scenes.filter((scene) => !sceneIsRendered(slug, scene.number));
  await writeSubtitles(slug, plan);
  if (missing.length > 0) {
    await writeManifest({ slug, plan, spentCents, video: null });
    say(`\n${plan.scenes.length - missing.length}/${plan.scenes.length} scenes are on disk.`);
    say(`Missing: ${missing.map((scene) => scene.number).join(", ")}. Run the command again to fill the gaps.`);
    say(`Saved in ${lessonDirectory(slug)}`);
    return;
  }
  say("\nJoining the clips…");
  const stitched = await stitchLesson({ slug, plan });
  if (!stitched.ok) {
    await writeManifest({ slug, plan, spentCents, video: null });
    fail(`the clips could not be joined: ${stitched.message}`);
  }
  await writeManifest({ slug, plan, spentCents, video: "lesson.mp4" });
  say(`✓ ${stitched.path}${stitched.reEncoded ? " (re-encoded)" : ""}`);
  say(`  ${lessonDurationSeconds(plan)} seconds, ${plan.scenes.length} scenes, spent ${money(spentCents)}`);
}

async function main(): Promise<void> {
  const parsed = parseRenderArgs(process.argv.slice(2));
  if (!parsed.ok) fail(parsed.message);
  const args = parsed.args;

  const plan = await loadPlan(args.planPath);
  const slug = args.slug ?? basename(args.planPath).replace(/\.json$/i, "");
  const selected = args.scenes
    ? plan.scenes.filter((scene) => args.scenes?.includes(scene.number))
    : plan.scenes;
  if (selected.length === 0) fail("the --scenes selection matches no scene in this plan");

  say(`${plan.title}`);
  say(`${plan.scenes.length} scenes · ${lessonDurationSeconds(plan)} seconds · recordings/${slug}/\n`);

  if (args.dryRun) {
    await ensureLessonDirectory(slug);
    for (const scene of selected) {
      const path = await writeScenePrompt({ slug, sceneNumber: scene.number, prompt: scenePrompt(plan, scene) });
      say(`  ✓ ${path}`);
    }
    say(`\nNothing was rendered and nothing was spent. Read the prompts, then run without --dry-run.`);
    return;
  }

  if (args.joinOnly) {
    await finish(slug, plan, 0);
    return;
  }

  const pending = args.force
    ? selected
    : selected.filter((scene) => !sceneIsRendered(slug, scene.number));
  if (pending.length === 0) {
    say("Every selected scene is already on disk. Nothing to render.");
    await finish(slug, plan, 0);
    return;
  }

  const falKey = process.env.FAL_KEY?.trim();
  if (!falKey) fail("FAL_KEY is missing. Put it in .env.local or in the environment.");

  const estimate = pending.length * RENDER_CONFIG.videoAttemptCostCents;
  say(`${pending.length} scene(s) to render: ${pending.map((scene) => scene.number).join(", ")}`);
  say(`This spends about ${money(estimate)} of fal credit. fal's billing is the source of truth.`);
  if (!args.confirmed && !(await confirm("Render now?"))) {
    fail("stopped before any spend. Use --yes to skip this question.");
  }
  say("");

  const summary = await renderScenes({ slug, plan, scenes: pending, falKey, onEvent: report });
  const failures = summary.outcomes.filter((outcome) => !outcome.ok);
  await finish(slug, plan, summary.spentCents);
  if (failures.length > 0) {
    fail(`${failures.length} scene(s) failed. The scenes that worked are kept, so a re-run only pays for the rest.`);
  }
}

await main();
