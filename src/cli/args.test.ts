import assert from "node:assert/strict";
import test from "node:test";

import { parseRenderArgs, parseSceneSelection } from "./args";

test("reads a mixed scene selection", () => {
  assert.deepEqual(parseSceneSelection("1,4-6,4"), [1, 4, 5, 6]);
});

test("refuses a selection that is not a scene list", () => {
  assert.equal(parseSceneSelection("all"), null);
  assert.equal(parseSceneSelection("0"), null);
  assert.equal(parseSceneSelection("6-4"), null);
  assert.equal(parseSceneSelection(""), null);
});

test("reads the plan path and the flags", () => {
  const result = parseRenderArgs(["lessons/rain.json", "--dry-run", "--scenes", "2-3", "--yes"]);
  assert.ok(result.ok);
  assert.equal(result.args.planPath, "lessons/rain.json");
  assert.equal(result.args.dryRun, true);
  assert.equal(result.args.confirmed, true);
  assert.deepEqual(result.args.scenes, [2, 3]);
});

test("defaults to every scene and to asking before it spends", () => {
  const result = parseRenderArgs(["lessons/rain.json"]);
  assert.ok(result.ok);
  assert.equal(result.args.scenes, null);
  assert.equal(result.args.confirmed, false);
  assert.equal(result.args.force, false);
});

test("needs a plan file", () => {
  assert.equal(parseRenderArgs([]).ok, false);
  assert.equal(parseRenderArgs(["a.json", "b.json"]).ok, false);
});

test("refuses an unknown option and an option with no value", () => {
  assert.equal(parseRenderArgs(["a.json", "--turbo"]).ok, false);
  assert.equal(parseRenderArgs(["a.json", "--scenes"]).ok, false);
});

test("refuses to write prompts and join in the same run", () => {
  assert.equal(parseRenderArgs(["a.json", "--dry-run", "--join-only"]).ok, false);
});
