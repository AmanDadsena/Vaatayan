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

/** Returns the saved household if it is complete and in range, otherwise null. */
export function readStoredHousehold(v: unknown): Household | null {
  if (!isRecord(v)) return null;
  const { people, commuteKm, notes } = LIMITS;
  const valid =
    intIn(v.adults, 1, people.max) &&
    intIn(v.children, 0, people.max) &&
    intIn(v.elders, 0, people.max) &&
    Array.isArray(v.conditions) &&
    v.conditions.length <= CONDITIONS.length &&
    v.conditions.every((c) => oneOf(CONDITIONS, c)) &&
    oneOf(COMMUTE_MODES, v.commuteMode) &&
    numIn(v.commuteKm, commuteKm.min, commuteKm.max) &&
    typeof v.hasPurifier === "boolean" &&
    oneOf(COOKING_FUELS, v.cookingFuel) &&
    oneOf(HEATING_SOURCES, v.heating) &&
    oneOf(EXERCISE_TIMES, v.exercise) &&
    (v.notes === undefined || (typeof v.notes === "string" && v.notes.length <= notes.max));
  if (!valid) return null;
  return {
    adults: v.adults as number,
    children: v.children as number,
    elders: v.elders as number,
    conditions: [...(v.conditions as Household["conditions"])],
    commuteMode: v.commuteMode as Household["commuteMode"],
    commuteKm: v.commuteKm as number,
    hasPurifier: v.hasPurifier as boolean,
    cookingFuel: v.cookingFuel as Household["cookingFuel"],
    heating: v.heating as Household["heating"],
    exercise: v.exercise as Household["exercise"],
    notes: (v.notes as string | undefined) ?? "",
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
