# Live Classroom

A content pipeline. You write a lesson plan by hand, one narrated beat per five-second scene.
The pipeline compiles each beat into a video prompt, renders it with MiniMax H3 Max Turbo on
[fal.ai](https://fal.ai), saves every clip, and joins them into one lesson video.

No model plans the lesson at render time. That is the point: an auto-written plan gives you
slop, and you pay for slop twelve clips at a time. The plan is a file you control.

```
you + Claude ──► lessons/rain.json ──► npm run render ──► recordings/rain/
 (in a chat)        12 hand-written           │             scene-01…12.mp4  + .json
                    beats                     │             lesson.mp4
                                              ▼             lesson.srt
                                        fal / H3 Max        lesson.json
```

The teacher is Wally, a wombat in round glasses and a yellow scarf. He lives in one file. To
ship a different character, rewrite `TEACHER` and `STYLE` in `src/lib/teacher.ts`. Keep the
character sheet as short numbered lines: fal's prompt rewriter copies a list word for word, but
it paraphrases prose and drops features without saying so.

## Install

Node 22.9 or later (`.nvmrc`) and a fal.ai key.

```bash
npm install
cp .env.example .env.local    # then fill in FAL_KEY
```

## Make a lesson

```bash
npm run render -- lessons/example-how-rain-works.json --dry-run   # free
npm run render -- lessons/example-how-rain-works.json --scenes 1  # one clip, about $0.13
npm run render -- lessons/example-how-rain-works.json             # the rest, then join
```

Read [docs/lesson-plan-authoring.md](docs/lesson-plan-authoring.md) to write your own plan. It
holds the format, the rules, and the prompt that starts an authoring session with Claude.

### Options

| Option | What it does |
|---|---|
| `--dry-run` | Writes the compiled prompt for every scene. Calls nothing. Spends nothing. |
| `--scenes 1,4-6` | Works on these scenes only. |
| `--force` | Renders a scene again although its clip is on disk. **This spends money again.** |
| `--join-only` | Joins the clips that are already on disk. |
| `--yes` | Does not ask before it spends. |
| `--out <slug>` | Writes to `recordings/<slug>/` instead of the plan file name. |

## What it costs

One clip is five seconds at 480p. The command prints an estimate and waits for your answer
before it calls fal. fal's billing is the source of truth: multiply the per-second 480p rate on
the [H3 Max Turbo page](https://fal.ai/models/minimax/h3-max-turbo/text-to-video) by five.

Four things protect the credit:

1. `--dry-run` proves the plan and the prompts before any call.
2. `--scenes 1` renders one clip, so you approve the character before you buy eleven more.
3. A finished clip is never rendered again without `--force`. A failure at scene 7 does not
   pay for scenes 1 to 6 a second time.
4. `RENDER_CONFIG.ceilingCents` in `src/lib/render-config.ts` stops one command dead.

## What you get

`recordings/<slug>/` holds:

| File | Content |
|---|---|
| `scene-NN.mp4` | The clip. |
| `scene-NN.json` | The narration, the prompt sent, fal's rewritten prompt, and the timings. |
| `lesson.mp4` | Every clip joined, in order. |
| `lesson.srt` | Subtitles, one block per scene. |
| `lesson.json` | The manifest: title, scenes, duration, and what the run spent. |

`recordings/` is git-ignored.

## Prompt debugging

The one thing to know: look at what fal **actually** rendered from, not at what you sent. H3
rewrites every prompt before it renders, and a rewrite can silently drop the glasses or the
scarf.

```bash
npm run prompts -- <slug>            # a table of which character features survived, per scene
npm run prompts -- <slug> --full     # the whole rewritten prompt for every scene
```

If a feature is missing from most scenes, make its line in the character sheet shorter and more
concrete. Do not add a second sentence about it.

## Gates

```bash
npm run typecheck && npm run lint && npm test
npm run verify      # proves the command validates, writes prompts, and never calls fal without a key
```

## Layout

```
lessons/      lesson plans (input, hand-written)
docs/         how to write a plan
src/lib/      the teacher, the prompt compiler, the plan schema, the limits
src/render/   the fal client, the render loop, the output files, the join step
src/cli/      the render command
scripts/      the no-spend check and the prompt-expansion report
recordings/   output (git-ignored)
```

## License

MIT.
