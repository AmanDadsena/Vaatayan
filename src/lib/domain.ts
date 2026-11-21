/**
 * Shared vocabulary and limits, with no validation library attached, so the
 * browser bundle stays small. The server builds its strict Zod schemas from
 * these same constants (src/lib/schemas.ts); tests keep the two in agreement.
 */
import type { Household, Place } from "./schemas";

export const COMMUTE_MODES = ["car", "two-wheeler", "auto", "bus", "metro", "walk-cycle", "home"] as const;
export const COOKING_FUELS = ["lpg", "electric", "biomass"] as const;
export const HEATING_SOURCES = ["none", "electric", "gas", "wood-coal", "kerosene"] as const;
export const EXERCISE_TIMES = ["none", "morning", "evening"] as const;
export const CONDITIONS = ["asthma-copd", "heart", "pregnancy"] as const;

export const LIMITS = {
  people: { max: 12 },
  commuteKm: { min: 0, max: 150 },
  notes: { max: 280 },
  placeName: { max: 120 },
} as const;

export const DEFAULT_HOUSEHOLD: Household = {
  adults: 2,
  children: 1,
  elders: 1,
  conditions: [],
  commuteMode: "car",
  commuteKm: 12,
  hasPurifier: false,
  cookingFuel: "lpg",
  heating: "electric",
  exercise: "morning",
  notes: "",
};

/* ---------- Lightweight checks for data the browser saved earlier ---------- */

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const intIn = (v: unknown, min: number, max: number) =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const numIn = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const oneOf = <T extends string>(options: readonly T[], v: unknown): v is T => options.includes(v as T);

/**
 * One check per household field. Typed as a Record over every key, so adding a
 * field to Household without a check here is a compile error.
 */
const HOUSEHOLD_CHECKS: Record<keyof Household, (v: unknown) => boolean> = {
  adults: (v) => intIn(v, 1, LIMITS.people.max),
  children: (v) => intIn(v, 0, LIMITS.people.max),
  elders: (v) => intIn(v, 0, LIMITS.people.max),
  conditions: (v) => Array.isArray(v) && v.length <= CONDITIONS.length && v.every((c) => oneOf(CONDITIONS, c)),
  commuteMode: (v) => oneOf(COMMUTE_MODES, v),
  commuteKm: (v) => numIn(v, LIMITS.commuteKm.min, LIMITS.commuteKm.max),
  hasPurifier: (v) => typeof v === "boolean",
  cookingFuel: (v) => oneOf(COOKING_FUELS, v),
  heating: (v) => oneOf(HEATING_SOURCES, v),
  exercise: (v) => oneOf(EXERCISE_TIMES, v),
  notes: (v) => v === undefined || (typeof v === "string" && v.length <= LIMITS.notes.max),
};

/** Returns the saved household if it is complete and in range, otherwise null. */
export function readStoredHousehold(v: unknown): Household | null {
  if (!isRecord(v)) return null;
  const valid = (Object.keys(HOUSEHOLD_CHECKS) as (keyof Household)[]).every((key) => HOUSEHOLD_CHECKS[key](v[key]));
  if (!valid) return null;
  // Checked above; copy field by field so unknown keys are dropped.
  const h = v as Household;
  return {
    adults: h.adults,
    children: h.children,
    elders: h.elders,
    conditions: [...h.conditions],
    commuteMode: h.commuteMode,
    commuteKm: h.commuteKm,
    hasPurifier: h.hasPurifier,
    cookingFuel: h.cookingFuel,
    heating: h.heating,
    exercise: h.exercise,
    notes: h.notes ?? "",
  };
}

/** Returns the saved place if it has a name and valid coordinates, otherwise null. */
export function readStoredPlace(v: unknown): Place | null {
  if (!isRecord(v)) return null;
  const valid =
    typeof v.name === "string" &&
    v.name.trim().length > 0 &&
    v.name.length <= LIMITS.placeName.max &&
    numIn(v.latitude, -90, 90) &&
    numIn(v.longitude, -180, 180);
  return valid
    ? { name: (v.name as string).trim(), latitude: v.latitude as number, longitude: v.longitude as number }
    : null;
}
