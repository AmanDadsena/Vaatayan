import { MODES, VENTILATION } from "./impact";
import { TRIPS_PER_COMMUTE_DAY } from "./assumptions";
import type { FuelProfile } from "./fuels";
import type { CommuteMode } from "./schemas";

/**
 * "What if" calculations for the Impact Lab. Every function is pure so the
 * numbers on screen are reproducible and covered by tests.
 */

export { COOKING, HEATING } from "./fuels";

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
  return ((TRIPS_PER_COMMUTE_DAY * km) / m.speedKmh) * m.ventilation * pm25 * m.exposureFactor;
}

/** CO₂ and smog particles one person's commute emits in a week. */
export function commuteWeekly(mode: CommuteMode, km: number, days: number) {
  const weeklyKm = mode === "home" ? 0 : TRIPS_PER_COMMUTE_DAY * km * days;
  return {
    co2KgPerWeek: weeklyKm * MODES[mode].co2PerKm,
    smogGPerWeek: weeklyKm * MODES[mode].pmPerKm,
  };
}

/** A commute switch to compare: the same trip, taken two ways, on a day with this outdoor PM2.5. */
interface CommuteSwitch {
  from: CommuteMode;
  to: CommuteMode;
  /** One-way distance. */
  km: number;
  /** Commuting days a week. */
  days: number;
  pm25: number;
}

/** How much CO₂, smog and breathed PM2.5 a commute switch saves; positive means the new mode is better. */
export function compareCommute({ from, to, km, days, pm25 }: CommuteSwitch): Delta {
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

/** What switching a home from one fuel to another saves, for this many people. */
export function compareFuel(from: FuelProfile, to: FuelProfile, people: number): Delta {
  return {
    lungsUgPerDay: Math.round(fuelDose(from, people) - fuelDose(to, people)),
    co2KgPerWeek: r1(from.co2KgPerWeek - to.co2KgPerWeek),
    smogGPerWeek: r1(from.smogGPerWeek - to.smogGPerWeek),
  };
}

/** Adds several savings into one. */
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

interface ScaledImpact {
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
