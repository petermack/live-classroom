# Working in this repo

This is a command-line content pipeline, not a web app. It turns a hand-written lesson plan
into one narrated cartoon video. There is no server, no browser code and no runtime planner.

- Gates: `npm run typecheck && npm run lint && npm test` must pass before any change is done.
  Add `npm run verify` for anything that touches the render command, the plan schema or the
  prompt compiler.
- **Rendering costs real money.** One scene is one paid clip. Never render to test. The free
  path is `npm run render -- <plan> --dry-run`, which compiles every prompt and calls nothing,
  and `npm run verify`, which proves the command refuses to spend without a key.
- Ask the owner before you run any command that can reach fal. `--scenes 1` is the smallest
  paid check and needs consent like any other.
- The character and the style live only in `src/lib/teacher.ts`. The character sheet must stay
  short numbered lines: fal's prompt rewriter copies lists word for word, but it paraphrases
  prose and drops features without saying so.
- After any prompt change, render one scene (with consent), then run
  `npm run prompts -- <slug>` to see which character-sheet lines survived the rewrite.
- Lesson plans are written by hand in `lessons/`. Do not add a model call that writes them.
  `docs/lesson-plan-authoring.md` is the format and the rules.
- Never commit `.env.local` or `recordings/`.
