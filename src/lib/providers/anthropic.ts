import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { modelPlanSchema, type ModelPlan } from "../schemas";
import { AiUnavailableError, DECLINED_NOTE, type AiProvider } from "./types";

export const ANTHROPIC_DEFAULT_MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic({ maxRetries: 1, timeout: 45_000 });
  return client;
}

function toUnavailable(error: unknown): AiUnavailableError {
  if (error instanceof AiUnavailableError) return error;
  if (error instanceof Anthropic.RateLimitError) return new AiUnavailableError("The AI service is busy.");
  if (error instanceof Anthropic.AuthenticationError) return new AiUnavailableError("The AI key is not valid.");
  if (error instanceof Anthropic.APIError) return new AiUnavailableError(`The AI service returned ${error.status}.`);
  return new AiUnavailableError("The AI service could not be reached.");
}

export function createAnthropicProvider(model = process.env.AI_MODEL || ANTHROPIC_DEFAULT_MODEL): AiProvider {
  return {
    name: "anthropic",
    model,

    async generatePlan(system, prompt, signal): Promise<ModelPlan> {
      try {
        const response = await getClient().messages.parse(
          {
            model,
            max_tokens: 8000,
            output_config: { effort: "low", format: zodOutputFormat(modelPlanSchema) },
            // Stable system prompt, cached across requests.
            system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
            messages: [{ role: "user", content: prompt }],
          },
          { signal },
        );
        if (response.stop_reason === "refusal" || !response.parsed_output) {
          throw new AiUnavailableError(`No usable plan (stop reason: ${response.stop_reason}).`);
        }
        return response.parsed_output;
      } catch (error) {
        throw toUnavailable(error);
      }
    },

    async *streamText(system, prompt, signal) {
      const stream = getClient().messages.stream(
        {
          model,
          max_tokens: 4000,
          output_config: { effort: "low" },
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: prompt }],
        },
        { signal },
      );
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") yield DECLINED_NOTE;
      } finally {
        stream.abort();
      }
    },
  };
}
