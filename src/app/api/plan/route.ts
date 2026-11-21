import { NextResponse } from "next/server";
import { AiUnavailableError, generateModelPlan, isAiConfigured } from "@/lib/ai";
import { checkJsonPost } from "@/lib/http";
import { buildContext, type ImpactContext } from "@/lib/impact";
import { buildRulePlan, mergeModelPlan, type PlanResponse } from "@/lib/planner";
import { createRateLimiter } from "@/lib/rateLimit";
import { planRequestSchema, type Place } from "@/lib/schemas";

export const maxDuration = 60;

const limiter = createRateLimiter({ limit: 8, windowMs: 60_000 });

/** The AI plan when a model is configured and answers; otherwise the rules plan. */
async function choosePlan(place: Place, ctx: ImpactContext, signal: AbortSignal): Promise<PlanResponse> {
  if (!isAiConfigured()) return { plan: buildRulePlan(ctx) };
  try {
    return { plan: mergeModelPlan(ctx, await generateModelPlan(place, ctx, signal)) };
  } catch (error) {
    const notice = error instanceof AiUnavailableError ? error.message : "The AI service failed.";
    return { plan: buildRulePlan(ctx), notice };
  }
}

/** Builds a household's smog plan for today's air. */
export async function POST(request: Request) {
  const input = await checkJsonPost(request, {
    limiter,
    schema: planRequestSchema,
    busy: "You've asked for several plans in a row. Try again in a minute.",
    badBody: "Send the plan request as JSON under 32 KB.",
  });
  if (!input.ok) return input.response;

  const { place, air, household } = input.data;
  const result = await choosePlan(place, buildContext(household, air), request.signal);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
