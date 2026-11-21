/**
 * US EPA Air Quality Index categories (2024 revision of the PM2.5 breakpoints
 * does not change the category boundaries on the 0–500 index itself).
 */
export type AqiLevel = "good" | "moderate" | "sensitive" | "unhealthy" | "very-unhealthy" | "hazardous";

export interface AqiCategory {
  level: AqiLevel;
  label: string;
  /** Upper bound of the category on the US AQI scale (inclusive). */
  max: number;
  /** Plain-language guidance for a healthy adult. */
  advice: string;
}

const HAZARDOUS: AqiCategory = {
  level: "hazardous",
  label: "Hazardous",
  max: Number.POSITIVE_INFINITY,
  advice: "Stay indoors with filtered air. Only go out if you must, and wear an N95.",
};

export const AQI_CATEGORIES: readonly AqiCategory[] = [
  { level: "good", label: "Good", max: 50, advice: "Air is clean. A good day to air out your home." },
  {
    level: "moderate",
    label: "Moderate",
    max: 100,
    advice: "Fine for most people. Unusually sensitive people should ease off long outdoor workouts.",
  },
  {
    level: "sensitive",
    label: "Unhealthy for sensitive groups",
    max: 150,
    advice: "Children, older adults and anyone with asthma or heart disease should limit time outside.",
  },
  {
    level: "unhealthy",
    label: "Unhealthy",
    max: 200,
    advice: "Everyone should cut back on outdoor exertion. Keep windows shut at peak hours.",
  },
  {
    level: "very-unhealthy",
    label: "Very unhealthy",
    max: 300,
    advice: "Move exercise indoors, wear a well-fitted N95 outside and run filtration at home.",
  },
  HAZARDOUS,
] as const;

/** Returns the category for a US AQI value. Negative or non-finite input is treated as 0. */
export function categorize(aqi: number): AqiCategory {
  const value = Number.isFinite(aqi) && aqi > 0 ? aqi : 0;
  // The last category's upper bound is Infinity, so a match always exists; the fallback keeps the type honest.
  return AQI_CATEGORIES.find((c) => value <= c.max) ?? HAZARDOUS;
}

/** US EPA PM2.5 breakpoints (2024 revision): [concLow, concHigh, aqiLow, aqiHigh]. */
const PM25_BREAKPOINTS: readonly [number, number, number, number][] = [
  [0, 9.0, 0, 50],
  [9.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 125.4, 151, 200],
  [125.5, 225.4, 201, 300],
  [225.5, 325.4, 301, 500],
];

/**
 * Converts a PM2.5 concentration (µg/m³) to the US AQI scale by linear
 * interpolation. Used for hourly readings, because the reported US AQI is a
 * 24-hour rolling average and hides the hour-to-hour swings that matter when
 * choosing when to go outside.
 */
export function aqiFromPm25(pm25: number): number {
  if (!Number.isFinite(pm25) || pm25 <= 0) return 0;
  const c = Math.floor(pm25 * 10) / 10; // EPA truncates to one decimal
  for (const [cLo, cHi, iLo, iHi] of PM25_BREAKPOINTS) {
    if (c <= cHi) {
      const lo = Math.max(cLo, Math.min(c, cHi));
      return Math.round(((iHi - iLo) / (cHi - cLo)) * (lo - cLo) + iLo);
    }
  }
  return 500;
}

/**
 * How thick the visual haze should be (0 = crystal clear, 1 = opaque smog).
 * Uses a soft curve so the difference between 150 and 300 is still visible.
 */
export function hazeDensity(aqi: number): number {
  const value = Math.max(0, Math.min(aqi, 500));
  return Math.round(Math.sqrt(value / 500) * 100) / 100;
}

/**
 * Berkeley Earth rule of thumb: breathing air at 22 µg/m³ of PM2.5 for a day
 * is roughly comparable to smoking one cigarette.
 */
export const PM25_PER_CIGARETTE_DAY = 22;

export function cigarettesPerDay(pm25: number): number {
  if (!Number.isFinite(pm25) || pm25 <= 0) return 0;
  return Math.round((pm25 / PM25_PER_CIGARETTE_DAY) * 10) / 10;
}
