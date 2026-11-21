import type { CommuteMode, Condition, CookingFuel, ExerciseTime, HeatingSource } from "./schemas";

/** Human-readable labels shared by the forms and the Impact Lab. */
export const COMMUTE_LABELS: Record<CommuteMode, string> = {
  car: "Car",
  "two-wheeler": "Two-wheeler",
  auto: "Auto",
  bus: "Bus",
  metro: "Metro",
  "walk-cycle": "Walk or cycle",
  home: "Work from home",
};

export const CONDITION_LABELS: Record<Condition, string> = {
  "asthma-copd": "Asthma or COPD",
  heart: "Heart condition",
  pregnancy: "Pregnancy",
};

export const COOKING_LABELS: Record<CookingFuel, string> = {
  lpg: "LPG or piped gas",
  electric: "Induction or electric",
  biomass: "Wood, dung or coal",
};

export const HEATING_LABELS: Record<HeatingSource, string> = {
  none: "No heating",
  electric: "Electric heater",
  gas: "Gas heater",
  "wood-coal": "Wood or coal",
  kerosene: "Kerosene",
};

export const EXERCISE_LABELS: Record<ExerciseTime, string> = {
  none: "Rarely",
  morning: "Mornings",
  evening: "Evenings",
};
