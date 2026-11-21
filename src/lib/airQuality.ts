import "server-only";
import { z } from "zod";
import { aqiFromPm25 } from "./aqi";
import { airSnapshotSchema, type AirSnapshot, type Place } from "./schemas";

const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
/** Air quality is modelled hourly; 15 minutes of caching is plenty fresh. */
const AIR_REVALIDATE_SECONDS = 900;
const GEO_REVALIDATE_SECONDS = 86_400;
const TIMEOUT_MS = 8000;

export class UpstreamError extends Error {
  /** HTTP status from the upstream service, when there was a response. */
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
    this.name = "UpstreamError";
  }
}

const num = z.number().nullable();

const openMeteoAirSchema = z.object({
  timezone: z.string(),
  current: z.object({
    time: z.string(),
    us_aqi: num,
    pm2_5: num,
    pm10: num,
    nitrogen_dioxide: num,
    ozone: num,
  }),
  hourly: z.object({
    time: z.array(z.string()),
    us_aqi: z.array(num),
    pm2_5: z.array(num),
  }),
});

const openMeteoGeoSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        admin1: z.string().optional(),
      }),
    )
    .optional(),
});

async function getJsonOnce(url: URL, revalidate: number): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      next: { revalidate },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new UpstreamError("The air quality service did not respond in time.");
  }
  if (!res.ok) throw new UpstreamError(`The air quality service returned ${res.status}.`, res.status);
  return res.json();
}

/** A 4xx means the request itself is wrong; retrying cannot help. */
const isClientError = (error: unknown) =>
  error instanceof UpstreamError && error.status !== undefined && error.status >= 400 && error.status < 500;

/** One retry for transient timeouts and 5xx responses. */
async function getJson(url: URL, revalidate: number): Promise<unknown> {
  try {
    return await getJsonOnce(url, revalidate);
  } catch (error) {
    if (isClientError(error)) throw error;
    return getJsonOnce(url, revalidate);
  }
}

/** Last good reading per rounded location, served if the upstream is briefly down. */
const lastGood = new Map<string, { snapshot: AirSnapshot; at: number }>();
const LAST_GOOD_MAX_AGE_MS = 3 * 60 * 60 * 1000;
const LAST_GOOD_MAX_ENTRIES = 500;

/** Rounds coordinates to ~1 km: better cache hit rate and less precise location data leaves the server. */
export const roundCoord = (n: number) => Math.round(n * 100) / 100;

/**
 * Converts Open-Meteo's parallel arrays into hourly readings for the next
 * 24 hours starting at the current hour, skipping hours with missing data.
 */
export function toSnapshot(raw: unknown): AirSnapshot {
  const data = openMeteoAirSchema.parse(raw);
  const { current, hourly } = data;
  const currentHour = current.time.slice(0, 13);
  const startIndex = Math.max(
    0,
    hourly.time.findIndex((t) => t.slice(0, 13) === currentHour),
  );

  const readings = [];
  for (let i = startIndex; i < hourly.time.length && readings.length < 24; i++) {
    const time = hourly.time[i];
    const pm25 = hourly.pm2_5[i];
    if (time === undefined || pm25 === null || pm25 === undefined) continue;
    // Hourly AQI comes from that hour's PM2.5, not the 24 h rolling us_aqi field.
    readings.push({ time: time.slice(0, 16), aqi: aqiFromPm25(pm25), pm25: Math.round(pm25 * 10) / 10 });
  }

  return airSnapshotSchema.parse({
    time: current.time.slice(0, 16),
    timezone: data.timezone,
    aqi: Math.round(current.us_aqi ?? readings[0]?.aqi ?? 0),
    pm25: Math.round((current.pm2_5 ?? readings[0]?.pm25 ?? 0) * 10) / 10,
    pm10: Math.round((current.pm10 ?? 0) * 10) / 10,
    no2: Math.round((current.nitrogen_dioxide ?? 0) * 10) / 10,
    ozone: Math.round((current.ozone ?? 0) * 10) / 10,
    hourly: readings,
  });
}

export async function fetchAir(latitude: number, longitude: number): Promise<AirSnapshot> {
  const key = `${roundCoord(latitude)},${roundCoord(longitude)}`;
  try {
    const snapshot = await fetchAirFresh(latitude, longitude);
    if (lastGood.size >= LAST_GOOD_MAX_ENTRIES) lastGood.delete(lastGood.keys().next().value as string);
    lastGood.set(key, { snapshot, at: Date.now() });
    return snapshot;
  } catch (error) {
    const cached = lastGood.get(key);
    if (cached && Date.now() - cached.at < LAST_GOOD_MAX_AGE_MS) return cached.snapshot;
    throw error;
  }
}

async function fetchAirFresh(latitude: number, longitude: number): Promise<AirSnapshot> {
  const url = new URL(AIR_URL);
  url.searchParams.set("latitude", String(roundCoord(latitude)));
  url.searchParams.set("longitude", String(roundCoord(longitude)));
  url.searchParams.set("current", "us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone");
  url.searchParams.set("hourly", "us_aqi,pm2_5");
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", "auto");
  const raw = await getJson(url, AIR_REVALIDATE_SECONDS);
  try {
    return toSnapshot(raw);
  } catch {
    throw new UpstreamError("The air quality service sent data we could not read.");
  }
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const url = new URL(GEO_URL);
  url.searchParams.set("name", query);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const parsed = openMeteoGeoSchema.safeParse(await getJson(url, GEO_REVALIDATE_SECONDS));
  if (!parsed.success) throw new UpstreamError("The place search sent data we could not read.");
  return (parsed.data.results ?? []).map((r) => ({
    name: [r.name, r.admin1, r.country].filter(Boolean).join(", ").slice(0, 120),
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}
