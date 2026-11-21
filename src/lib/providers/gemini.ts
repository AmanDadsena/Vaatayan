import "server-only";
import { ApiError, FinishReason, GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { modelPlanSchema, type ModelPlan } from "../schemas";
import { AiUnavailableError, DECLINED_NOTE, type AiProvider } from "./types";

export const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";

/** The plan schema as JSON Schema, for Gemini's JSON mode. Built once. */
const PLAN_JSON_SCHEMA: Record<string, unknown> = { ...z.toJSONSchema(modelPlanSchema) };
delete PLAN_JSON_SCHEMA.$schema;

export function geminiApiKey(): string | undefined {
  return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || undefined;
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  // System instructions and JSON mode need v1beta; some key types default to v1.
  client ??= new GoogleGenAI({ apiKey: geminiApiKey(), apiVersion: "v1beta" });
  return client;
}

function toUnavailable(error: unknown): AiUnavailableError {
  if (error instanceof AiUnavailableError) return error;
  if (error instanceof ApiError) {
    if (error.status === 429) return new AiUnavailableError("The AI service is busy.");
    if (error.status === 401 || error.status === 403) return new AiUnavailableError("The AI key is not valid.");
    return new AiUnavailableError(`The AI service returned ${error.status}.`);
  }
  return new AiUnavailableError("The AI service could not be reached.");
}

const BLOCKED: ReadonlySet<string> = new Set([
  FinishReason.SAFETY,
  FinishReason.RECITATION,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
]);

/**
 * Gemini 2.5 models think by default. A modest budget keeps plans thoughtful
 * but quick; follow-up answers skip thinking for a near-instant reply.
 * Other model families use their own defaults.
 */
function thinking(model: string, budget: number) {
  return model.startsWith("gemini-2.5") ? { thinkingConfig: { thinkingBudget: budget } } : {};
}

export function createGeminiProvider(model = process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL): AiProvider {
  return {
    name: "gemini",
    model,

    async generatePlan(system, prompt, signal): Promise<ModelPlan> {
      try {
        const response = await getClient().models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: system,
            responseMimeType: "application/json",
            responseJsonSchema: PLAN_JSON_SCHEMA,
            maxOutputTokens: 8000,
            ...thinking(model, 1024),
            abortSignal: signal,
          },
        });
        const finish = response.candidates?.[0]?.finishReason;
        if (response.promptFeedback?.blockReason || (finish && BLOCKED.has(finish))) {
          throw new AiUnavailableError("The AI declined to write a plan.");
        }
        let json: unknown;
        try {
          json = JSON.parse(response.text ?? "");
        } catch {
          throw new AiUnavailableError("The AI returned an incomplete plan.");
        }
        // Validate again on our side: never trust model output's shape.
        const parsed = modelPlanSchema.safeParse(json);
        if (!parsed.success) throw new AiUnavailableError("The AI returned a plan in the wrong shape.");
        return parsed.data;
      } catch (error) {
        throw toUnavailable(error);
      }
    },

    async *streamText(system, prompt, signal) {
      const stream = await getClient().models.generateContentStream({
        model,
        contents: prompt,
        config: { systemInstruction: system, maxOutputTokens: 4000, ...thinking(model, 0), abortSignal: signal },
      });
      let blocked = false;
      for await (const chunk of stream) {
        if (chunk.text) yield chunk.text;
        const finish = chunk.candidates?.[0]?.finishReason;
        if (chunk.promptFeedback?.blockReason || (finish && BLOCKED.has(finish))) blocked = true;
      }
      if (blocked) yield DECLINED_NOTE;
    },
  };
}
