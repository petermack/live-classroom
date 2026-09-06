# How to write a lesson plan

A lesson plan is one JSON file in `lessons/`. It holds every word the teacher says and every
thing the camera sees. Nothing else writes it: no planner model runs at render time. You and
Claude write the plan together in a separate session, and the render command obeys it exactly.

Give the file a short name in kebab case, because the file name becomes the output folder:
`lessons/how-rain-works.json` renders into `recordings/how-rain-works/`.

## The format

```json
{
  "title": "Where rain comes from",
  "topic": "the water cycle, for a curious beginner",
  "bigQuestion": "How does water get from the sea into a raincloud?",
  "scenes": [
    {
      "narration": "The rain on your window was in the ocean last week.",
      "visualAction": "Wide shot. Wally stands at a rain-streaked window and points at one drop.",
      "note": "optional, for you only. It never reaches fal."
    }
  ]
}
```

| Field | Required | What it does |
|---|---|---|
| `title` | yes | Names the lesson. Goes in the manifest, not in the video. |
| `topic` | yes | One line about the subject and the audience. For your record. |
| `bigQuestion` | no | The question the lesson answers. For your record. |
| `scenes[].narration` | yes | The exact words the teacher speaks in this clip. |
| `scenes[].visualAction` | yes | What the camera sees in this clip. |
| `scenes[].note` | no | A comment for you. The render command ignores it. |

One scene is one clip of five seconds. Twelve scenes make a one-minute lesson. The limit is 24.

## The rules the command enforces

The render command refuses a plan that breaks any of these. It says which scene is wrong.

- Every scene has a `narration` and a `visualAction`.
- A narration is 20 words or fewer, because a clip is five seconds long. Above 15 words you get
  a warning, because the delivery starts to sound rushed.
- No narration repeats another narration.
- No narration says the teacher's own name.
- A `visualAction` is 500 characters or fewer.
- The plan has 1 to 24 scenes.

A repeated `visualAction` is a warning, not an error.

## The rules you must keep yourself

The command cannot check these. They decide whether the lesson is good or is slop.

1. **Write one arc, not twelve small lessons.** Hook, then foundation, then mechanism, then an
   example, then the common mistake, then the recap. Each beat must move the last beat forward.
2. **The narration is the teacher's own speech, in the first person, to one learner.** He never
   names himself, the show, or the video. He never claims the idea as his own.
3. **In `visualAction`, name the teacher only by name.** Never describe how he looks. His
   appearance comes from the character sheet in `src/lib/teacher.ts`, and a second description
   in the beat makes the render drift.
4. **Never add a second character.** The character sheet says he is the only one.
5. **Change the staging every beat.** Wide, then close, then a diagram, then a cutaway. Two
   near-identical beats in a row look like an error in the output.
6. **Say one fact per beat.** Five seconds holds one idea and no more.
7. **Be accurate.** Nothing downstream checks the content.

## Starting a session with Claude

Paste this, then talk the topic through before any JSON is written.

> I want a lesson plan for my video pipeline. Read `docs/lesson-plan-authoring.md` and
> `src/lib/teacher.ts` first. The topic is: **\<your topic>**. The audience is: **\<who>**.
> Work with me on the arc in plain language first. List the twelve beats as one line each and
> wait for my changes. Only when I approve the arc, write the JSON to
> `lessons/<name>.json`, then run `npm run render -- lessons/<name>.json --dry-run` and show me
> the compiled prompt for one scene. Do not render anything. Rendering costs real money and I
> start it myself.

## After the plan is written

```bash
npm run render -- lessons/<name>.json --dry-run     # free. Writes every compiled prompt.
npm run render -- lessons/<name>.json --scenes 1    # about $0.13. Approve the character first.
npm run render -- lessons/<name>.json               # the rest, then one joined video.
```
