/**
 * Shared vocabulary and limits, with no validation library attached, so the
 * browser bundle stays small. The server builds its strict Zod schemas from
 * these same constants (src/lib/schemas.ts); tests keep the two in agreement.
 */
import { isOneOf, keysOf } from "./objects";
import type { Household, Place } from "./schemas";

export const COMMUTE_MODES = ["car", "two-wheeler", "auto", "bus", "metro", "walk-cycle", "home"] as const;
export const COOKING_FUELS = ["lpg", "electric", "biomass"] as const;
export const HEATING_SOURCES = ["none", "electric", "gas", "wood-coal", "kerosene"] as const;
export const EXERCISE_TIMES = ["none", "morning", "evening"] as const;
export const CONDITIONS = ["asthma-copd", "heart", "pregnancy"] as const;

/** localStorage keys. Versioned so a future format change can ignore old data. */
export const STORAGE_KEYS = {
  place: "vaatayan.place.v1",
  household: "vaatayan.household.v1",
  checklist: "vaatayan.checklist.v1",
} as const;

export const LIMITS = {
  people: { max: 12 },
  commuteKm: { min: 0, max: 150 },
  notes: { max: 280 },
  placeName: { max: 120 },
} as const;

/** Where the app opens before the visitor picks a place: the city most affected by winter smog. */
export const DEFAULT_PLACE: Place = { name: "New Delhi, Delhi, India", latitude: 28.61, longitude: 77.21 };

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
const numIn = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const intIn = (v: unknown, min: number, max: number): v is number => numIn(v, min, max) && Number.isInteger(v);

/**
 * One check per household field. Typed as a Record over every key, so adding a
 * field to Household without a check here is a compile error.
 */
const HOUSEHOLD_CHECKS: Record<keyof Household, (v: unknown) => boolean> = {
  adults: (v) => intIn(v, 1, LIMITS.people.max),
  children: (v) => intIn(v, 0, LIMITS.people.max),
  elders: (v) => intIn(v, 0, LIMITS.people.max),
  conditions: (v) => Array.isArray(v) && v.length <= CONDITIONS.length && v.every((c) => isOneOf(CONDITIONS, c)),
  commuteMode: (v) => isOneOf(COMMUTE_MODES, v),
  commuteKm: (v) => numIn(v, LIMITS.commuteKm.min, LIMITS.commuteKm.max),
  hasPurifier: (v) => typeof v === "boolean",
  cookingFuel: (v) => isOneOf(COOKING_FUELS, v),
  heating: (v) => isOneOf(HEATING_SOURCES, v),
  exercise: (v) => isOneOf(EXERCISE_TIMES, v),
  notes: (v) => v === undefined || (typeof v === "string" && v.length <= LIMITS.notes.max),
};

function isStoredHousehold(v: unknown): v is Household {
  return isRecord(v) && keysOf(HOUSEHOLD_CHECKS).every((key) => HOUSEHOLD_CHECKS[key](v[key]));
}

/** Returns the saved household if it is complete and in range, otherwise null. */
export function readStoredHousehold(h: unknown): Household | null {
  if (!isStoredHousehold(h)) return null;
  // Copy field by field so unknown keys are dropped.
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

function isStoredPlace(v: unknown): v is Place {
  return (
    isRecord(v) &&
    typeof v.name === "string" &&
    v.name.trim().length > 0 &&
    v.name.length <= LIMITS.placeName.max &&
    numIn(v.latitude, -90, 90) &&
    numIn(v.longitude, -180, 180)
  );
}

/** Returns the saved place if it has a name and valid coordinates, otherwise null. */
export function readStoredPlace(v: unknown): Place | null {
  return isStoredPlace(v) ? { name: v.name.trim(), latitude: v.latitude, longitude: v.longitude } : null;
}
