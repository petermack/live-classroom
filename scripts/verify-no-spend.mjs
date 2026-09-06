// No-spend smoke test. Proves that the render command validates a plan, writes prompts, and
// refuses to call fal without a key. It never reaches the network.
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

function check(condition, message) {
  if (!condition) throw new Error(message);
  process.stdout.write(`✓ ${message}\n`);
}

// The command is started as node, not as npm. On Windows npm is a .cmd file, which spawn cannot
// start without a shell. Starting node also keeps .env.local out of the child, so the checks
// below cannot see a real key even on a machine that has one.
function render(args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--import", "tsx", "src/cli/render-lesson.ts", ...args], {
      cwd: process.cwd(),
      env: { ...process.env, FAL_KEY: "", ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); });
    child.on("close", (code) => resolve({ code, output }));
  });
}

const workspace = await mkdtemp(join(tmpdir(), "lesson-verify-"));
const slug = `verify-${process.pid}`;
try {
  const goodPlan = join(workspace, "good.json");
  await writeFile(goodPlan, JSON.stringify({
    title: "Verification lesson",
    topic: "how this pipeline is checked",
    scenes: [
      { narration: "This line is only a test.", visualAction: "A checklist on a wall" },
      { narration: "Nothing here reaches fal.", visualAction: "A closed laptop" },
    ],
  }));

  const badPlan = join(workspace, "bad.json");
  await writeFile(badPlan, JSON.stringify({ title: "Broken", topic: "x", scenes: [{ narration: "" }] }));

  const rejected = await render([badPlan, "--dry-run", "--out", slug]);
  check(rejected.code === 1, "an invalid plan is rejected");
  check(rejected.output.includes("visualAction is missing"), "the reason for the rejection is named");

  const dry = await render([goodPlan, "--dry-run", "--out", slug]);
  check(dry.code === 0, "a valid plan passes a dry run");
  check(dry.output.includes("nothing was spent") || dry.output.includes("Nothing was rendered"),
    "the dry run says that it spent nothing");
  const prompt = await readFile(join(process.cwd(), "recordings", slug, "scene-01.prompt.txt"), "utf8");
  check(prompt.includes("CHARACTER SHEET"), "the dry run writes the compiled character sheet");
  check(prompt.includes("This line is only a test."), "the dry run writes the narration into the prompt");

  const noKey = await render([goodPlan, "--out", slug]);
  check(noKey.code === 1, "a render without FAL_KEY stops");
  check(noKey.output.includes("FAL_KEY is missing"), "the missing key is named");

  process.stdout.write("\nNo fal call was made. No credit was spent.\n");
} finally {
  await rm(workspace, { recursive: true, force: true });
  await rm(join(process.cwd(), "recordings", slug), { recursive: true, force: true });
}
