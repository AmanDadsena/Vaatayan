import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchAir, UpstreamError } from "@/lib/airQuality";
import { checkQuery, jsonError } from "@/lib/http";
import { createRateLimiter } from "@/lib/rateLimit";

const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

/** A required numeric query value. A bare z.coerce.number() would turn a missing param into 0. */
const coordinate = (min: number, max: number) =>
  z.string().trim().min(1, "is required").pipe(z.coerce.number<string>().min(min).max(max));

const querySchema = z.object({
  lat: coordinate(-90, 90),
  lon: coordinate(-180, 180),
});

/** Current and hourly air quality for a coordinate. */
export async function GET(request: Request) {
  const query = checkQuery(request, {
    limiter,
    schema: querySchema,
    keys: ["lat", "lon"],
    busy: "Too many requests. Try again shortly.",
  });
  if (!query.ok) return query.response;

  try {
    const air = await fetchAir(query.data.lat, query.data.lon);
    return NextResponse.json(air, { headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=600" } });
  } catch (error) {
    return jsonError(502, error instanceof UpstreamError ? error.message : "Could not load air quality right now.");
  }
}
