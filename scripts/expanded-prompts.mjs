// Prints what fal ACTUALLY rendered from. H3 rewrites every prompt before it renders, and a
// rewrite can drop a feature of the character. This reads the saved scenes and shows which
// numbered character-sheet lines survived.
// Usage: npm run prompts -- <slug> [--full]
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

const [slug, ...flags] = process.argv.slice(2);
if (!slug) throw new Error("usage: npm run prompts -- <slug> [--full]");
const directory = join(process.cwd(), "recordings", slug);

const files = (await readdir(directory)).filter((name) => /^scene-\d+\.json$/.test(name)).sort();
if (files.length === 0) throw new Error(`no rendered scenes in ${directory}`);

// One pattern per feature that the rewriter has dropped before.
const features = {
  wombat: /wombat/i,
  glasses: /glasses|spectacles/i,
  scarf: /scarf/i,
  yellow: /yellow/i,
  nose: /nose/i,
  ears: /ears?\b/i,
  claws: /claws?\b/i,
  // A rewriter drops a negative more readily than a feature, so watch these two closely.
  "no hair": /no hair|hairless|without hair/i,
  smooth: /smooth/i,
  "flat 2D": /flat 2d|cel/i,
  accent: /australian/i,
};

console.log(["scene", "shots", ...Object.keys(features)].join(" | "));
for (const file of files) {
  const scene = JSON.parse(await readFile(join(directory, file), "utf8"));
  const text = scene.expandedPrompt ?? "";
  const shots = (text.match(/\[Shot/g) ?? []).length;
  const row = Object.values(features).map((pattern) => (pattern.test(text) ? "Y" : "-"));
  console.log([String(scene.sceneNumber).padStart(5), String(shots).padStart(5), ...row].join(" | "));
}

if (flags.includes("--full")) {
  for (const file of files) {
    const scene = JSON.parse(await readFile(join(directory, file), "utf8"));
    console.log(`\n===== scene ${scene.sceneNumber} =====`);
    console.log(scene.expandedPrompt ?? "(fal returned no expansion)");
  }
}
