import { NextResponse } from "next/server";
import { z } from "zod";
import { searchPlaces, UpstreamError } from "@/lib/airQuality";
import { checkQuery, jsonError } from "@/lib/http";
import { createRateLimiter } from "@/lib/rateLimit";

const limiter = createRateLimiter({ limit: 90, windowMs: 60_000 });

const querySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Type at least two letters.")
    .max(80)
    .regex(/^[\p{L}\p{M}\s'.,-]+$/u, "Use letters only."),
});

/** Place names matching a search, with coordinates, for the location picker. */
export async function GET(request: Request) {
  const query = checkQuery(request, {
    limiter,
    schema: querySchema,
    keys: ["q"],
    busy: "Too many searches. Try again shortly.",
  });
  if (!query.ok) return query.response;

  try {
    const places = await searchPlaces(query.data.q);
    return NextResponse.json({ places }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (error) {
    return jsonError(502, error instanceof UpstreamError ? error.message : "Place search is unavailable.");
  }
}
