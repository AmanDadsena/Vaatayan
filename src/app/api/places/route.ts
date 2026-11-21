import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { searchPlaces, UpstreamError } from "@/lib/airQuality";
import { jsonError, validationMessage } from "@/lib/http";
import { clientKey, createRateLimiter } from "@/lib/rateLimit";

const limiter = createRateLimiter({ limit: 90, windowMs: 60_000 });

const querySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Type at least two letters.")
    .max(80)
    .regex(/^[\p{L}\p{M}\s'.,-]+$/u, "Use letters only."),
});

export async function GET(request: NextRequest) {
  const rate = limiter.check(clientKey(request.headers));
  if (!rate.ok) return jsonError(429, "Too many searches. Try again shortly.", { "Retry-After": String(rate.retryAfterSeconds) });

  const parsed = querySchema.safeParse({ q: request.nextUrl.searchParams.get("q") ?? "" });
  if (!parsed.success) return jsonError(400, validationMessage(parsed.error));

  try {
    const places = await searchPlaces(parsed.data.q);
    return NextResponse.json({ places }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (error) {
    return jsonError(502, error instanceof UpstreamError ? error.message : "Place search is unavailable.");
  }
}
