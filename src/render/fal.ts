import { fal } from "@fal-ai/client";
import { FAL_CONFIG } from "@/lib/render-config";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type RenderTimings = Readonly<{
  requestId: string;
  queueWaitMs: number | null;
  inferenceMs: number | null;
  totalMs: number;
}>;

export type FalVideoResult = Readonly<{
  providerUrl: string;
  expandedPrompt: string | null;
  queueLogs: readonly string[];
  timings: RenderTimings;
}>;

function validRemoteUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function parseFalResult(
  value: unknown,
  queueLogs: readonly string[],
  observed: Readonly<{ queueWaitMs: number | null; totalMs: number }>,
): FalVideoResult {
  if (!isRecord(value) || !isRecord(value.data) || !isRecord(value.data.video)) {
    throw new Error("fal returned an invalid H3 Max response");
  }
  const providerUrl = value.data.video.url;
  if (!validRemoteUrl(providerUrl)) {
    throw new Error("fal returned an invalid video URL");
  }
  const expandedPrompt =
    typeof value.data.expanded_prompt === "string" ? value.data.expanded_prompt : null;
  const inferenceSeconds = isRecord(value.data.timings) ? value.data.timings.inference : null;
  const inferenceMs =
    typeof inferenceSeconds === "number" && Number.isFinite(inferenceSeconds)
      ? inferenceSeconds * 1_000
      : null;
  return {
    providerUrl,
    expandedPrompt,
    queueLogs,
    timings: {
      requestId: typeof value.requestId === "string" ? value.requestId : "unknown",
      queueWaitMs: observed.queueWaitMs,
      inferenceMs,
      totalMs: observed.totalMs,
    },
  };
}

export async function generateH3MaxClip(input: {
  prompt: string;
  falKey: string;
}): Promise<FalVideoResult> {
  fal.config({ credentials: input.falKey });
  const queueLogs: string[] = [];
  const submittedAtMs = Date.now();
  let beganRunningAtMs: number | null = null;
  const result: unknown = await fal.subscribe(FAL_CONFIG.endpoint, {
    input: {
      prompt: input.prompt,
      duration: FAL_CONFIG.duration,
      resolution: FAL_CONFIG.resolution,
      aspect_ratio: FAL_CONFIG.aspectRatio,
      seed: FAL_CONFIG.seed,
      prompt_expansion_mode: FAL_CONFIG.promptExpansionMode,
    },
    mode: "streaming",
    connectionMode: "server",
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && beganRunningAtMs === null) {
        beganRunningAtMs = Date.now();
      }
      if ("logs" in update && Array.isArray(update.logs)) {
        for (const log of update.logs) {
          if (isRecord(log) && typeof log.message === "string") {
            queueLogs.push(log.message);
          }
        }
      }
    },
  });
  const completedAtMs = Date.now();
  return parseFalResult(result, queueLogs, {
    queueWaitMs:
      beganRunningAtMs === null ? null : Math.max(0, beganRunningAtMs - submittedAtMs),
    totalMs: completedAtMs - submittedAtMs,
  });
}
