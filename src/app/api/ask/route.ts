import { isAiConfigured, streamAnswer } from "@/lib/ai";
import { checkJsonPost } from "@/lib/http";
import { buildContext } from "@/lib/impact";
import { quickAnswer } from "@/lib/quickAnswers";
import { createRateLimiter } from "@/lib/rateLimit";
import { askRequestSchema } from "@/lib/schemas";

export const maxDuration = 60;

const limiter = createRateLimiter({ limit: 12, windowMs: 60_000 });

const TEXT_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

/** Answers one follow-up question as plain text, streamed from the AI model or taken from built-in guidance. */
export async function POST(request: Request) {
  const input = await checkJsonPost(request, {
    limiter,
    schema: askRequestSchema,
    busy: "That's a lot of questions at once. Try again in a minute.",
    badBody: "Send the question as JSON under 32 KB.",
  });
  if (!input.ok) return input.response;

  const ctx = buildContext(input.data.household, input.data.air);

  // Without an AI key, answer from built-in guidance grounded in the same live data.
  if (!isAiConfigured()) {
    const { text, topic } = quickAnswer(input.data.question, ctx);
    return new Response(text, { headers: { ...TEXT_HEADERS, "X-Answer-Source": "rules", "X-Answer-Topic": topic } });
  }

  return new Response(streamAnswer(input.data, ctx, request.signal), {
    headers: { ...TEXT_HEADERS, "X-Answer-Source": "ai" },
  });
}
