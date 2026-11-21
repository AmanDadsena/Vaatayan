import "server-only";
import { createHash } from "node:crypto";
import type { ImpactContext } from "./impact";
import { ASK_SYSTEM_PROMPT, buildAskPrompt, buildPlanPrompt, PLAN_SYSTEM_PROMPT } from "./prompts";
import { createAnthropicProvider } from "./providers/anthropic";
import { createGeminiProvider, geminiApiKey } from "./providers/gemini";
import { AiUnavailableError, DECLINED_NOTE, type AiProvider } from "./providers/types";
import { createTtlCache } from "./ttlCache";
import type { AskRequest, ModelPlan, Place } from "./schemas";

export { AiUnavailableError };

/**
 * Picks the language model from the keys present on the server:
 * Anthropic first, then Google Gemini; with neither, the app uses built-in rules.
 */
export function getProvider(): AiProvider | null {
  if (process.env.ANTHROPIC_API_KEY) return createAnthropicProvider();
  if (geminiApiKey()) return createGeminiProvider();
  return null;
}

/** True when an AI key is set, so plans and answers can come from a model. */
export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || geminiApiKey());
}

/*
 * Identical inputs build identical prompts, so validated results are cached
 * briefly: asking again is instant and does not spend AI quota. Air data
 * changes hourly, so 30 minutes keeps answers current. Sizes are capped.
 */
const CACHE_TTL_MS = 30 * 60 * 1000;
const planCache = createTtlCache<ModelPlan>({ ttlMs: CACHE_TTL_MS, maxEntries: 300 });
const answerCache = createTtlCache<string>({ ttlMs: CACHE_TTL_MS, maxEntries: 500 });

/** Empties both caches (used by tests, and safe to call at any time). */
export function clearAiCaches(): void {
  planCache.clear();
  answerCache.clear();
}

/** Cache key: provider, model and a SHA-256 of the full prompt (no raw text is kept as a key). */
export function cacheKey(provider: AiProvider, system: string, prompt: string): string {
  const digest = createHash("sha256").update(system).update("\n---\n").update(prompt).digest("hex");
  return `${provider.name}:${provider.model}:${digest}`;
}

/** Asks the configured model for a plan, served from cache when the same air and household were seen recently. */
export async function generateModelPlan(place: Place, ctx: ImpactContext, signal?: AbortSignal): Promise<ModelPlan> {
  const provider = getProvider();
  if (!provider) throw new AiUnavailableError("No AI key is configured.");
  const prompt = buildPlanPrompt(place, ctx);
  const key = cacheKey(provider, PLAN_SYSTEM_PROMPT, prompt);
  const cached = planCache.get(key);
  if (cached) return cached;
  const plan = await provider.generatePlan(PLAN_SYSTEM_PROMPT, prompt, signal);
  planCache.set(key, plan);
  return plan;
}

/** Shown when an answer fails part-way; what already arrived stays on screen. */
const CUT_OFF_NOTE = "\n\nThe answer was cut off. Please try again.";

/** The answer in chunks: from the cache when this exact question was answered recently, otherwise from the model. */
async function* answerChunks(provider: AiProvider, prompt: string, signal?: AbortSignal): AsyncGenerator<string> {
  const key = cacheKey(provider, ASK_SYSTEM_PROMPT, prompt);
  const cached = answerCache.get(key);
  if (cached !== undefined) {
    yield cached;
    return;
  }
  let answer = "";
  for await (const text of provider.streamText(ASK_SYSTEM_PROMPT, prompt, signal)) {
    answer += text;
    yield text;
  }
  // Only complete answers the model did not decline are worth repeating.
  if (answer.trim() && !answer.includes(DECLINED_NOTE.trim())) answerCache.set(key, answer);
}

/** Streams the answer as plain UTF-8 text chunks, whichever provider is configured. */
export function streamAnswer(req: AskRequest, ctx: ImpactContext, signal?: AbortSignal): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const provider = getProvider();
  // Aborted when the visitor leaves, so the model call stops at once instead of finishing unread.
  const stop = new AbortController();
  const aborted = signal ? AbortSignal.any([signal, stop.signal]) : stop.signal;
  const chunks = provider ? answerChunks(provider, buildAskPrompt(req, ctx), aborted) : null;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!chunks) throw new AiUnavailableError("No AI key is configured.");
        for await (const text of chunks) {
          if (stop.signal.aborted) return;
          controller.enqueue(encoder.encode(text));
        }
      } catch {
        // After a cancel the stream is closed to writes; otherwise tell the reader the answer stopped short.
        if (stop.signal.aborted) return;
        controller.enqueue(encoder.encode(CUT_OFF_NOTE));
      }
      controller.close();
    },
    cancel() {
      stop.abort();
    },
  });
}
