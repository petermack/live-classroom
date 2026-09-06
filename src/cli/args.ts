export type RenderArgs = Readonly<{
  planPath: string;
  slug: string | null;
  scenes: readonly number[] | null;
  dryRun: boolean;
  joinOnly: boolean;
  force: boolean;
  confirmed: boolean;
}>;

export type ArgsResult =
  | Readonly<{ ok: true; args: RenderArgs }>
  | Readonly<{ ok: false; message: string }>;

// "1,4-6" becomes [1, 4, 5, 6]. The list is sorted and has no duplicates.
export function parseSceneSelection(value: string): readonly number[] | null {
  const numbers = new Set<number>();
  for (const part of value.split(",")) {
    const piece = part.trim();
    if (!piece) return null;
    const range = /^(\d+)-(\d+)$/.exec(piece);
    if (range) {
      const from = Number(range[1]);
      const to = Number(range[2]);
      if (from < 1 || to < from) return null;
      for (let index = from; index <= to; index += 1) numbers.add(index);
      continue;
    }
    if (!/^\d+$/.test(piece)) return null;
    const single = Number(piece);
    if (single < 1) return null;
    numbers.add(single);
  }
  return numbers.size > 0 ? [...numbers].sort((left, right) => left - right) : null;
}

export function parseRenderArgs(argv: readonly string[]): ArgsResult {
  let planPath: string | null = null;
  let slug: string | null = null;
  let scenes: readonly number[] | null = null;
  let dryRun = false;
  let joinOnly = false;
  let force = false;
  let confirmed = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] ?? "";
    if (argument === "--dry-run") { dryRun = true; continue; }
    if (argument === "--join-only") { joinOnly = true; continue; }
    if (argument === "--force") { force = true; continue; }
    if (argument === "--yes" || argument === "-y") { confirmed = true; continue; }
    if (argument === "--scenes" || argument === "--out") {
      const value = argv[index + 1];
      if (!value || value.startsWith("-")) return { ok: false, message: `${argument} needs a value` };
      index += 1;
      if (argument === "--out") { slug = value; continue; }
      const selection = parseSceneSelection(value);
      if (!selection) return { ok: false, message: `--scenes could not read "${value}"` };
      scenes = selection;
      continue;
    }
    if (argument.startsWith("-")) return { ok: false, message: `unknown option ${argument}` };
    if (planPath) return { ok: false, message: "give exactly one lesson plan file" };
    planPath = argument;
  }

  if (!planPath) return { ok: false, message: "give the path to a lesson plan JSON file" };
  if (dryRun && joinOnly) return { ok: false, message: "--dry-run and --join-only cannot be used together" };
  return { ok: true, args: { planPath, slug, scenes, dryRun, joinOnly, force, confirmed } };
}
