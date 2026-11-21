import { MODES, VENTILATION } from "./impact";
import type { CommuteMode, CookingFuel, HeatingSource } from "./schemas";

/**
 * "What if" calculations for the Impact Lab. Every function is pure so the
 * numbers on screen are reproducible and covered by tests.
 */

/** India's grid emission factor, kg CO₂ per kWh (CEA baseline, rounded). */
export const GRID_CO2_PER_KWH = 0.71;

export interface FuelProfile {
  label: string;
  /** kg CO₂ a week (fossil only; burning wood or dung is counted as biogenic). */
  co2KgPerWeek: number;
  /** g PM2.5 a week released into the neighbourhood. */
  smogGPerWeek: number;
  /** Extra indoor PM2.5 while in use, µg/m³. */
  indoorSpike: number;
  /** Hours a day in use. */
  hoursPerDay: number;
  note: string;
}

/** Winter heating for one room, about 4 hours a day. */
export const HEATING: Record<HeatingSource, FuelProfile> = {
  none: { label: "No heating", co2KgPerWeek: 0, smogGPerWeek: 0, indoorSpike: 0, hoursPerDay: 0, note: "Layers and a warm cap do a lot." },
  electric: {
    label: "Electric heater",
    co2KgPerWeek: Math.round(1.5 * 4 * 7 * GRID_CO2_PER_KWH * 10) / 10,
    smogGPerWeek: 0,
    indoorSpike: 0,
    hoursPerDay: 4,
    note: "No smoke at home, but the grid still burns coal. Heat one closed room and insulate to cut this.",
  },
  gas: {
    label: "Gas heater",
    co2KgPerWeek: Math.round(0.6 * 7 * 2.98 * 10) / 10,
    smogGPerWeek: 0.5,
    indoorSpike: 10,
    hoursPerDay: 4,
    note: "Low particulate, but releases NO₂ indoors. Keep a window cracked.",
  },
  "wood-coal": {
    label: "Wood or coal",
    co2KgPerWeek: 0,
    smogGPerWeek: 210,
    indoorSpike: 60,
    hoursPerDay: 4,
    note: "The smokiest option by far, indoors and out.",
  },
  kerosene: {
    label: "Kerosene",
    co2KgPerWeek: Math.round(0.5 * 7 * 2.5 * 10) / 10,
    smogGPerWeek: 7,
    indoorSpike: 60,
    hoursPerDay: 4,
    note: "Unvented kerosene heaters fill rooms with fine particles and fumes.",
  },
};

export const COOKING: Record<CookingFuel, FuelProfile> = {
  lpg: {
    label: "LPG or piped gas",
    co2KgPerWeek: Math.round(0.4 * 7 * 2.98 * 10) / 10,
    smogGPerWeek: 0.2,
    indoorSpike: 60,
    hoursPerDay: 1,
    note: "Clean-burning; frying still makes a particle spike, so run the exhaust.",
  },
  electric: {
    label: "Induction",
    co2KgPerWeek: Math.round(1.5 * 7 * GRID_CO2_PER_KWH * 10) / 10,
    smogGPerWeek: 0,
    indoorSpike: 30,
    hoursPerDay: 1,
    note: "No combustion at home; cooking fumes from food remain.",
  },
  biomass: {
    label: "Wood, dung or coal",
    co2KgPerWeek: 0,
    smogGPerWeek: 112,
    indoorSpike: 400,
    hoursPerDay: 3,
    note: "Kitchens often reach hundreds of µg/m³; the cook and small children breathe most of it.",
  },
};

export interface Delta {
  /** Positive numbers mean the change is better (less breathed, less emitted). */
  lungsUgPerDay: number;
  co2KgPerWeek: number;
  smogGPerWeek: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** PM2.5 one commuter breathes in a day on a mode (µg). */
export function commuteDose(mode: CommuteMode, km: number, pm25: number): number {
  if (mode === "home" || km <= 0) return 0;
  const m = MODES[mode];
  return ((2 * km) / m.speedKmh) * m.ventilation * pm25 * m.exposureFactor;
}

export function commuteWeekly(mode: CommuteMode, km: number, days: number) {
  const weeklyKm = mode === "home" ? 0 : 2 * km * days;
  return {
    co2KgPerWeek: weeklyKm * MODES[mode].co2PerKm,
    smogGPerWeek: weeklyKm * MODES[mode].pmPerKm,
  };
}

export function compareCommute(from: CommuteMode, to: CommuteMode, km: number, days: number, pm25: number): Delta {
  const a = commuteWeekly(from, km, days);
  const b = commuteWeekly(to, km, days);
  return {
    lungsUgPerDay: Math.round(commuteDose(from, km, pm25) - commuteDose(to, km, pm25)),
    co2KgPerWeek: r1(a.co2KgPerWeek - b.co2KgPerWeek),
    smogGPerWeek: r1(a.smogGPerWeek - b.smogGPerWeek),
  };
}

function fuelDose(p: FuelProfile, people: number): number {
  return p.hoursPerDay * VENTILATION.rest * p.indoorSpike * people;
}

export function compareFuel(from: FuelProfile, to: FuelProfile, people: number): Delta {
  return {
    lungsUgPerDay: Math.round(fuelDose(from, people) - fuelDose(to, people)),
    co2KgPerWeek: r1(from.co2KgPerWeek - to.co2KgPerWeek),
    smogGPerWeek: r1(from.smogGPerWeek - to.smogGPerWeek),
  };
}

export function addDeltas(...deltas: Delta[]): Delta {
  return deltas.reduce(
    (t, d) => ({
      lungsUgPerDay: t.lungsUgPerDay + d.lungsUgPerDay,
      co2KgPerWeek: r1(t.co2KgPerWeek + d.co2KgPerWeek),
      smogGPerWeek: r1(t.smogGPerWeek + d.smogGPerWeek),
    }),
    { lungsUgPerDay: 0, co2KgPerWeek: 0, smogGPerWeek: 0 },
  );
}

/** A typical Indian petrol car: ~10,000 km a year at 0.17 kg CO₂/km. */
export const CAR_CO2_KG_PER_YEAR = 1700;

export interface ScaledImpact {
  co2TonnesPerYear: number;
  smogKgPerYear: number;
  carsEquivalent: number;
}

/** What happens if many households make the same change. */
export function scaleUp(delta: Delta, households: number): ScaledImpact {
  const co2Kg = delta.co2KgPerWeek * 52 * households;
  return {
    co2TonnesPerYear: Math.round((co2Kg / 1000) * 10) / 10,
    smogKgPerYear: Math.round(((delta.smogGPerWeek * 52 * households) / 1000) * 10) / 10,
    carsEquivalent: Math.round(co2Kg / CAR_CO2_KG_PER_YEAR),
  };
}

/** Purifier sizing: clean air delivery rate needed for a target air changes per hour. */
export function requiredCadr(lengthM: number, widthM: number, heightM: number, airChangesPerHour = 5) {
  const volume = Math.max(0, lengthM) * Math.max(0, widthM) * Math.max(0, heightM);
  const m3h = Math.round(volume * airChangesPerHour);
  return { volumeM3: Math.round(volume * 10) / 10, cadrM3h: m3h, cadrCfm: Math.round(m3h * 0.5886) };
}

/**
 * Minutes for a purifier to remove a given share of particles in a sealed
 * room, using first-order decay: C(t) = C0 · e^(−ACH·t).
 */
export function minutesToClean(cadrM3h: number, volumeM3: number, share = 0.8): number | null {
  if (cadrM3h <= 0 || volumeM3 <= 0 || share <= 0 || share >= 1) return null;
  const ach = cadrM3h / volumeM3;
  return Math.round((-Math.log(1 - share) / ach) * 60);
}

/** Concentration scales inversely with the depth of the mixed layer. */
export function concentrationForMixingHeight(baseAt1000m: number, heightM: number): number {
  const h = Math.min(3000, Math.max(50, heightM));
  return Math.round((baseAt1000m * 1000) / h);
}
