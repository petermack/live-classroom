# Contributing

Before opening a pull request, make sure all four gates pass locally:

```bash
npm run typecheck
npm run lint
npm test
npm run verify
```

CI runs the same four commands.

Rendering costs real money: one scene is one paid clip. Never render to test. Prove a change
to the prompt compiler with `npm run render -- <plan> --dry-run`, which compiles every prompt
and calls nothing.

The character and the style live only in `src/lib/teacher.ts`. After a change there, render one
scene (`--scenes 1`, about $0.13), then run `npm run prompts -- <slug>` and paste the survived-
features table in the pull request. fal's prompt rewriter drops features without saying so, so
the table is the only proof that the change reached the render.
