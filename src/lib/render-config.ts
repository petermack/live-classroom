export const RENDER_CONFIG = {
  clipDurationSeconds: 5,
  maxScenes: 24,
  // A narration line must be speakable inside one clip. 150 words per minute is a calm pace.
  wordsPerSecond: 2.5,
  videoConcurrency: 2,
  // One retry for a fal error that is not deterministic. A rejected prompt is never retried.
  renderRetries: 1,
  retryDelayMs: 1_500,
  videoAttemptCostCents: 13,
  // A hard stop. One command may never spend more than this, whatever the plan asks for.
  ceilingCents: 1_016,
} as const;

export const FAL_CONFIG = {
  endpoint: "minimax/h3-max-turbo/text-to-video",
  duration: RENDER_CONFIG.clipDurationSeconds,
  resolution: "480P",
  aspectRatio: "16:9",
  seed: 314_159,
  promptExpansionMode: "balanced",
} as const;
