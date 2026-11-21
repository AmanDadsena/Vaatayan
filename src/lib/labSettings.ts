import type { CommuteMode, CookingFuel, HeatingSource, Household } from "./schemas";

/** Everything the Impact Lab lets people change. */
export interface LabSettings {
  from: CommuteMode;
  to: CommuteMode;
  km: number;
  days: number;
  pm25: number;
  heatFrom: HeatingSource;
  heatTo: HeatingSource;
  cookFrom: CookingFuel;
  cookTo: CookingFuel;
  people: number;
  /** Index into HOUSEHOLD_STEPS for the "multiply it" slider. */
  stepIndex: number;
}

/** A useful first comparison when nothing has been saved yet. */
export const LAB_DEFAULTS: LabSettings = {
  from: "car",
  to: "metro",
  km: 12,
  days: 5,
  pm25: 90,
  heatFrom: "kerosene",
  heatTo: "electric",
  cookFrom: "lpg",
  cookTo: "lpg",
  people: 4,
  stepIndex: 3,
};

/**
 * Starts the lab from the household saved on the Today page: their own commute,
 * heater and stove on the left, and the most sensible switch on the right.
 */
export function seedLabSettings(saved: Household | null): LabSettings {
  if (!saved) return LAB_DEFAULTS;
  const commutes = saved.commuteMode !== "home";
  return {
    ...LAB_DEFAULTS,
    ...(commutes && {
      from: saved.commuteMode,
      to: saved.commuteMode === "metro" ? "walk-cycle" : "metro",
      km: Math.max(1, saved.commuteKm),
    }),
    heatFrom: saved.heating,
    heatTo: saved.heating === "electric" ? "none" : "electric",
    cookFrom: saved.cookingFuel,
    cookTo: saved.cookingFuel === "biomass" ? "lpg" : saved.cookingFuel,
    people: saved.adults + saved.children + saved.elders,
  };
}
