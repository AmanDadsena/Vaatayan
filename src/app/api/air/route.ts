import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fetchAir, UpstreamError } from "@/lib/airQuality";
import { jsonError, validationMessage } from "@/lib/http";
import { clientKey, createRateLimiter } from "@/lib/rateLimit";

const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

/** A required numeric query value. A bare z.coerce.number() would turn a missing param (null) into 0. */
const coordinate = (min: number, max: number) =>
  z.string({ error: "is required" }).trim().min(1, "is required").pipe(z.coerce.number<string>().min(min).max(max));

const querySchema = z.object({
  lat: coordinate(-90, 90),
  lon: coordinate(-180, 180),
});

export async function GET(request: NextRequest) {
  const rate = limiter.check(clientKey(request.headers));
  if (!rate.ok)
    return jsonError(429, "Too many requests. Try again shortly.", { "Retry-After": String(rate.retryAfterSeconds) });

  const parsed = querySchema.safeParse({
    lat: request.nextUrl.searchParams.get("lat") ?? undefined,
    lon: request.nextUrl.searchParams.get("lon") ?? undefined,
  });
  if (!parsed.success) return jsonError(400, validationMessage(parsed.error));

  try {
    const air = await fetchAir(parsed.data.lat, parsed.data.lon);
    return NextResponse.json(air, { headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=600" } });
  } catch (error) {
    const message = error instanceof UpstreamError ? error.message : "Could not load air quality right now.";
    return jsonError(502, message);
  }
}
