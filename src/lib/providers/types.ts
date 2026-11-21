import type { ModelPlan } from "../schemas";

/** Thrown when a model cannot produce a usable result; callers fall back to built-in rules. */
export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export type ProviderName = "anthropic" | "gemini";

/**
 * What every language-model provider must do. Prompts, validation and the
 * impact numbers are shared; a provider only knows how to talk to its API.
 */
export interface AiProvider {
  name: ProviderName;
  model: string;
  /** Returns a schema-valid plan or throws AiUnavailableError. */
  generatePlan(system: string, prompt: string, signal?: AbortSignal): Promise<ModelPlan>;
  /** Yields answer text as it arrives. May throw mid-stream; callers handle it. */
  streamText(system: string, prompt: string, signal?: AbortSignal): AsyncGenerator<string>;
}

/** Shown when a model declines to answer a follow-up. */
export const DECLINED_NOTE = "\n\nI can't help with that one. Try asking about your air or your plan.";
