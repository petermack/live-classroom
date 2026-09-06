import { RENDER_CONFIG } from "@/lib/render-config";
import { TEACHER } from "@/lib/teacher";

export type LessonScene = Readonly<{
  number: number;
  narration: string;
  visualAction: string;
  note: string | null;
}>;

export type LessonPlan = Readonly<{
  title: string;
  topic: string;
  bigQuestion: string | null;
  scenes: readonly LessonScene[];
}>;

export type LessonPlanResult = Readonly<{
  plan: LessonPlan | null;
  errors: readonly string[];
  warnings: readonly string[];
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function trimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

const MAX_NARRATION_WORDS = Math.round(
  RENDER_CONFIG.clipDurationSeconds * RENDER_CONFIG.wordsPerSecond * 1.6,
);
const COMFORTABLE_NARRATION_WORDS = Math.round(
  RENDER_CONFIG.clipDurationSeconds * RENDER_CONFIG.wordsPerSecond * 1.15,
);

// The teacher never says his own name. fal renders the line as spoken words, so a stray name
// makes the character introduce himself in the middle of a lesson.
const TEACHER_NAME_PATTERN = new RegExp(`\\b${TEACHER.name}\\b`, "i");

export function parseLessonPlan(value: unknown): LessonPlanResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(value)) {
    return { plan: null, errors: ["The lesson plan must be a JSON object"], warnings };
  }

  const title = trimmedString(value.title);
  const topic = trimmedString(value.topic);
  const bigQuestion = trimmedString(value.bigQuestion);
  if (!title) errors.push("title is missing or empty");
  if (title && title.length > 120) errors.push("title is longer than 120 characters");
  if (!topic) errors.push("topic is missing or empty");

  const rawScenes = value.scenes;
  if (!Array.isArray(rawScenes) || rawScenes.length === 0) {
    errors.push("scenes must be a non-empty array");
    return { plan: null, errors, warnings };
  }
  if (rawScenes.length > RENDER_CONFIG.maxScenes) {
    errors.push(`scenes has ${rawScenes.length} entries, but the maximum is ${RENDER_CONFIG.maxScenes}`);
  }

  const scenes: LessonScene[] = [];
  const seenNarration = new Map<string, number>();
  const seenVisual = new Map<string, number>();
  rawScenes.forEach((raw, index) => {
    const number = index + 1;
    const label = `scene ${number}`;
    if (!isRecord(raw)) {
      errors.push(`${label} is not an object`);
      return;
    }
    const narration = trimmedString(raw.narration);
    const visualAction = trimmedString(raw.visualAction);
    if (!narration) errors.push(`${label}: narration is missing or empty`);
    if (!visualAction) errors.push(`${label}: visualAction is missing or empty`);
    if (!narration || !visualAction) return;

    const words = wordCount(narration);
    if (words > MAX_NARRATION_WORDS) {
      errors.push(
        `${label}: narration is ${words} words. The limit is ${MAX_NARRATION_WORDS} words for a ${RENDER_CONFIG.clipDurationSeconds}-second clip`,
      );
    } else if (words > COMFORTABLE_NARRATION_WORDS) {
      warnings.push(
        `${label}: narration is ${words} words. ${COMFORTABLE_NARRATION_WORDS} words or fewer speak more calmly`,
      );
    }
    if (TEACHER_NAME_PATTERN.test(narration)) {
      errors.push(`${label}: narration says the teacher's own name (${TEACHER.name})`);
    }
    if (visualAction.length > 500) {
      errors.push(`${label}: visualAction is longer than 500 characters`);
    }

    const narrationKey = narration.toLowerCase();
    const firstNarration = seenNarration.get(narrationKey);
    if (firstNarration) errors.push(`${label}: narration repeats scene ${firstNarration}`);
    else seenNarration.set(narrationKey, number);

    const visualKey = visualAction.toLowerCase();
    const firstVisual = seenVisual.get(visualKey);
    if (firstVisual) warnings.push(`${label}: visualAction repeats scene ${firstVisual}`);
    else seenVisual.set(visualKey, number);

    scenes.push({ number, narration, visualAction, note: trimmedString(raw.note) });
  });

  if (errors.length > 0 || !title || !topic) {
    return { plan: null, errors, warnings };
  }
  return { plan: { title, topic, bigQuestion, scenes }, errors, warnings };
}

export function lessonDurationSeconds(plan: LessonPlan): number {
  return plan.scenes.length * RENDER_CONFIG.clipDurationSeconds;
}
