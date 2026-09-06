import { compileScenePrompt } from "@/lib/teacher";
import type { LessonPlan, LessonScene } from "@/lib/lesson-plan";
import { RENDER_CONFIG } from "@/lib/render-config";
import { classifyFalError } from "@/render/fal-error";
import { generateH3MaxClip } from "@/render/fal";
import { saveScene } from "@/render/output";

export function scenePrompt(plan: LessonPlan, scene: LessonScene): string {
  return compileScenePrompt({
    sceneNumber: scene.number,
    sceneCount: plan.scenes.length,
    visualAction: scene.visualAction,
    narration: scene.narration,
    clipDurationSeconds: RENDER_CONFIG.clipDurationSeconds,
  });
}

export type RenderEvent =
  | Readonly<{ kind: "started"; sceneNumber: number }>
  | Readonly<{ kind: "rendered"; sceneNumber: number; seconds: number }>
  | Readonly<{ kind: "retrying"; sceneNumber: number; message: string }>
  | Readonly<{ kind: "failed"; sceneNumber: number; message: string }>
  | Readonly<{ kind: "ceiling"; spentCents: number }>;

export type SceneOutcome = Readonly<{
  sceneNumber: number;
  ok: boolean;
  message: string | null;
}>;

export type RenderSummary = Readonly<{
  outcomes: readonly SceneOutcome[];
  spentCents: number;
  stoppedOnCeiling: boolean;
}>;

async function renderOneScene(input: {
  slug: string;
  plan: LessonPlan;
  scene: LessonScene;
  falKey: string;
  onEvent: (event: RenderEvent) => void;
  charge: () => boolean;
}): Promise<SceneOutcome> {
  const prompt = scenePrompt(input.plan, input.scene);
  const startedAtMs = Date.now();
  input.onEvent({ kind: "started", sceneNumber: input.scene.number });

  let lastMessage = "The render did not start";
  for (let attempt = 0; attempt <= RENDER_CONFIG.renderRetries; attempt += 1) {
    if (!input.charge()) {
      return { sceneNumber: input.scene.number, ok: false, message: "the spend ceiling was reached" };
    }
    try {
      const generated = await generateH3MaxClip({ prompt, falKey: input.falKey });
      await saveScene({
        slug: input.slug,
        record: {
          sceneNumber: input.scene.number,
          narration: input.scene.narration,
          visualAction: input.scene.visualAction,
          prompt,
          expandedPrompt: generated.expandedPrompt,
          sourceUrl: generated.providerUrl,
          timings: generated.timings,
          savedAt: new Date().toISOString(),
        },
      });
      input.onEvent({
        kind: "rendered",
        sceneNumber: input.scene.number,
        seconds: (Date.now() - startedAtMs) / 1_000,
      });
      return { sceneNumber: input.scene.number, ok: true, message: null };
    } catch (error) {
      const classified = classifyFalError(error);
      lastMessage = classified.message;
      // A rejected prompt gives the same answer every time, so a retry only wastes money.
      const deterministic =
        classified.code === "FAL_CONTENT_REJECTED" || classified.code === "FAL_REQUEST_REJECTED";
      if (deterministic || attempt === RENDER_CONFIG.renderRetries) break;
      input.onEvent({ kind: "retrying", sceneNumber: input.scene.number, message: lastMessage });
      await new Promise((resolve) => setTimeout(resolve, RENDER_CONFIG.retryDelayMs));
    }
  }
  input.onEvent({ kind: "failed", sceneNumber: input.scene.number, message: lastMessage });
  return { sceneNumber: input.scene.number, ok: false, message: lastMessage };
}

export async function renderScenes(input: {
  slug: string;
  plan: LessonPlan;
  scenes: readonly LessonScene[];
  falKey: string;
  onEvent?: (event: RenderEvent) => void;
}): Promise<RenderSummary> {
  const onEvent = input.onEvent ?? (() => {});
  const queue = [...input.scenes];
  const outcomes: SceneOutcome[] = [];
  let spentCents = 0;
  let stoppedOnCeiling = false;

  const charge = (): boolean => {
    const next = spentCents + RENDER_CONFIG.videoAttemptCostCents;
    if (next > RENDER_CONFIG.ceilingCents) {
      if (!stoppedOnCeiling) {
        stoppedOnCeiling = true;
        onEvent({ kind: "ceiling", spentCents });
      }
      return false;
    }
    spentCents = next;
    return true;
  };

  const worker = async (): Promise<void> => {
    for (;;) {
      const scene = queue.shift();
      if (!scene || stoppedOnCeiling) return;
      outcomes.push(
        await renderOneScene({
          slug: input.slug,
          plan: input.plan,
          scene,
          falKey: input.falKey,
          onEvent,
          charge,
        }),
      );
    }
  };

  const workers = Array.from(
    { length: Math.min(RENDER_CONFIG.videoConcurrency, Math.max(1, queue.length)) },
    worker,
  );
  await Promise.all(workers);
  outcomes.sort((left, right) => left.sceneNumber - right.sceneNumber);
  return { outcomes, spentCents, stoppedOnCeiling };
}
