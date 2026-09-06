// The teacher is fully described here and nowhere else. To ship a different character: rewrite
// characterSheet (short numbered lines — fal's prompt rewriter copies lists verbatim but compresses
// prose and silently drops features), then set name, voice and STYLE.
export const TEACHER = {
  name: "Wally",
  voice:
    "a warm medium-pitch adult male voice with a clear standard Australian English accent (never American or British) and a calm, friendly, unhurried delivery",
  characterSheet: [
    "1. Body: a plump standing wombat on two legs, about three heads tall, with a wide rounded body.",
    "2. Head: one big round head, as wide as the shoulders, held upright.",
    "3. Color: warm mid-brown fur as a solid flat fill, with a slightly lighter brown belly.",
    "4. Ears: two small rounded ears, one at each top corner of the head, with dusty pink centers.",
    "5. Eyes: two large round black eyes set wide apart, each with one white highlight dot.",
    "6. Glasses: round thin black wire glasses over both eyes, with straight arms back to the ears.",
    "7. Nose: one large dark-brown rounded nose in the middle of the face, with two small nostrils.",
    "8. Mouth: a small wide cartoon mouth below the nose that moves in sync with every word he says (clear lip sync); he only settles into his small friendly smile between sentences.",
    "9. Scarf: one bright yellow knitted scarf around the neck, with one long end hanging down the chest. The scarf is the only clothing.",
    "10. Arms: two short rounded arms with small paws and three dark claws on each paw.",
    "11. Legs: two short legs with wide flat feet and three dark claws on each foot.",
    "12. Nothing else on him: no shirt, no trousers, no hat, no bag, no accessories.",
    "13. Drawn as flat 2D cel art with black ink outlines and soft shading; never 3D, never glossy, never photo-real.",
  ],
} as const;

export const TEACHER_DESCRIPTION = [
  `${TEACHER.name.toUpperCase()} CHARACTER SHEET (${TEACHER.name} is the only character; keep every numbered line in the final prompt exactly as written, never summarize or omit a line):`,
  ...TEACHER.characterSheet,
].join("\n");

export const STYLE =
  "flat 2D hand-drawn cel animation in the style of a modern children's picture book: black ink outlines with soft rounded corners, gentle soft shading inside the outlines, and a light paper grain over the whole frame; a warm natural palette of mid-brown, cream, mustard yellow, soft sage green, dusty pink and clear sky blue; simple uncluttered backgrounds on an off-white paper ground with generous empty space; no gradients across large areas, no 3D rendering, no CGI, no photorealism, no glossy surfaces; calm limited animation with clear held poses";

export type ScenePromptInput = Readonly<{
  sceneNumber: number;
  sceneCount: number;
  visualAction: string;
  narration: string;
  clipDurationSeconds: number;
}>;

export function compileScenePrompt(input: ScenePromptInput): string {
  const beat = input.visualAction.trim().replace(/[.\s]+$/, "");
  const name = TEACHER.name;
  return [
    `${TEACHER_DESCRIPTION}\nVoice: ${TEACHER.voice}.`,
    `${input.clipDurationSeconds}-second 16:9 scene ${input.sceneNumber} of ${input.sceneCount} in one continuous illustrated lesson episode. ${name} is drawn exactly the same in every scene.`,
    `Visual beat: ${beat}. Let the scene use natural editorial cuts, expressive staging, and camera movement when they help the explanation.`,
    `${name} speaks this line with visible lip sync, his mouth shapes matching each word and his eyebrows and gestures animating with the delivery: "${input.narration.trim()}" ${name}'s voice is identical in every scene of this episode: ${TEACHER.voice}. Use clear narration and playful diegetic sound effects only. No background music and no musical score.`,
    `STYLE (mandatory): ${STYLE}. Never 3D, never CGI, never photorealistic, never modern digital vector art.`,
  ].join("\n\n");
}
