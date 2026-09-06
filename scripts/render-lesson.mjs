// Compiles an authored lesson-plan JSON file into H3 prompts and prints one of them. Dry run only:
// this script never imports the fal client and never spends, so `--dry-run` is required.
// Usage: npm run render -- lessons/sky-blue.json --dry-run [--scene N]
import { readFileSync } from "node:fs";
import process from "node:process";
import {
  CLASSROOM_CONFIG,
  compileH3ScenePrompt,
  quoteForDuration,
  sceneCountForDuration,
} from "../src/lib/classroom-config.ts";

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith("-"));
const dryRun = args.includes("--dry-run");
const sceneFlag = args.indexOf("--scene");
const requestedScene = sceneFlag === -1 ? 1 : Number(args[sceneFlag + 1]);

if (!file) {
  throw new Error("usage: npm run render -- <lesson.json> --dry-run [--scene N]");
}
if (!dryRun) {
  throw new Error(
    "This script only compiles prompts. Pass --dry-run. Lessons are rendered by the app, which spends fal credit.",
  );
}

const plan = JSON.parse(readFileSync(file, "utf8"));
const expectedScenes = sceneCountForDuration(plan.durationSeconds);
if (!Array.isArray(plan.steps) || plan.steps.length !== expectedScenes) {
  throw new Error(`${file} must hold exactly ${expectedScenes} steps for a ${plan.durationSeconds}-second lesson`);
}
for (const [index, step] of plan.steps.entries()) {
  for (const field of ["role", "narration", "concept", "visualAction"]) {
    if (typeof step[field] !== "string" || !step[field].trim()) {
      throw new Error(`Step ${index + 1} is missing ${field}`);
    }
  }
}
if (!Number.isInteger(requestedScene) || requestedScene < 1 || requestedScene > plan.steps.length) {
  throw new Error(`--scene must be between 1 and ${plan.steps.length}`);
}

const quote = quoteForDuration(plan.durationSeconds);
console.log(`${plan.title} — ${plan.bigQuestion}`);
console.log(`${file}: ${plan.steps.length} beats x ${CLASSROOM_CONFIG.clipDurationSeconds}s = ${plan.durationSeconds}s`);
if (plan.audience) console.log(`audience: ${plan.audience}`);
console.log(`DRY RUN: nothing was rendered. A real run of this lesson would cost about $${(quote.expectedCents / 100).toFixed(2)}.\n`);

for (const [index, step] of plan.steps.entries()) {
  console.log(`${String(index + 1).padStart(2)}  ${step.role.padEnd(13)} ${step.narration}`);
}

const step = plan.steps[requestedScene - 1];
console.log(`\n===== COMPILED PROMPT, SCENE ${requestedScene} =====`);
console.log(
  compileH3ScenePrompt({
    sceneNumber: requestedScene,
    visualAction: step.visualAction,
    narration: step.narration,
  }),
);
