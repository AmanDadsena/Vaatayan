import { NextResponse } from "next/server";
import { AiUnavailableError, generateModelPlan, isAiConfigured } from "@/lib/ai";
import { guardJsonPost, jsonError, readJson, validationMessage } from "@/lib/http";
import { buildContext } from "@/lib/impact";
import { buildRulePlan, mergeModelPlan, type Plan } from "@/lib/planner";
import { clientKey, createRateLimiter } from "@/lib/rateLimit";
import { planRequestSchema } from "@/lib/schemas";

export const maxDuration = 60;

const limiter = createRateLimiter({ limit: 8, windowMs: 60_000 });

export async function POST(request: Request) {
  const refused = guardJsonPost(request);
  if (refused) return refused;

  const rate = limiter.check(clientKey(request.headers));
  if (!rate.ok) {
    return jsonError(429, "You've asked for several plans in a row. Try again in a minute.", {
      "Retry-After": String(rate.retryAfterSeconds),
    });
  }

  let body: unknown;
  try {
    body = await readJson(request);
  } catch (error) {
    return jsonError(error instanceof RangeError ? 413 : 400, "Send the plan request as JSON under 32 KB.");
  }

  const parsed = planRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, validationMessage(parsed.error));

  const { place, air, household } = parsed.data;
  const ctx = buildContext(household, air);

  let plan: Plan;
  let notice: string | undefined;
  if (isAiConfigured()) {
    try {
      plan = mergeModelPlan(ctx, await generateModelPlan(place, ctx, request.signal));
    } catch (error) {
      plan = buildRulePlan(ctx);
      notice = error instanceof AiUnavailableError ? error.message : "The AI service failed.";
    }
  } else {
    plan = buildRulePlan(ctx);
  }

  return NextResponse.json({ plan, notice }, { headers: { "Cache-Control": "no-store" } });
}
