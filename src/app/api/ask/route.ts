import { isAiConfigured, streamAnswer } from "@/lib/ai";
import { jsonError, readJson, validationMessage } from "@/lib/http";
import { buildContext } from "@/lib/impact";
import { clientKey, createRateLimiter } from "@/lib/rateLimit";
import { askRequestSchema } from "@/lib/schemas";

export const maxDuration = 60;

const limiter = createRateLimiter({ limit: 12, windowMs: 60_000 });

export async function POST(request: Request) {
  if (!isAiConfigured()) {
    return jsonError(503, "Follow-up questions need an AI key on the server. Your plan above still works without one.");
  }

  const rate = limiter.check(clientKey(request.headers));
  if (!rate.ok) {
    return jsonError(429, "That's a lot of questions at once. Try again in a minute.", {
      "Retry-After": String(rate.retryAfterSeconds),
    });
  }

  let body: unknown;
  try {
    body = await readJson(request);
  } catch (error) {
    return jsonError(error instanceof RangeError ? 413 : 400, "Send the question as JSON under 32 KB.");
  }

  const parsed = askRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, validationMessage(parsed.error));

  const ctx = buildContext(parsed.data.household, parsed.data.air);
  return new Response(streamAnswer(parsed.data, ctx, request.signal), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
