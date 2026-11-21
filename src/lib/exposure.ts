import type { BreathWindow } from "./breathWindow";
import type { AirSnapshot, CommuteMode, Household } from "./schemas";

/**
 * The exposure model: physical constants, emission factors and the helpers
 * every action uses to turn a household and today's air into numbers.
 * Figures are deliberately conservative, rounded estimates.
 */

/* ---------- Physical constants (sources listed in METHOD_NOTES) ---------- */

/** Breathing (ventilation) rates for adults in m³ per hour. */
export const VENTILATION = { rest: 0.5, light: 0.9, play: 1.2, exercise: 2.0 } as const;
/** Indoor/outdoor PM2.5 ratio for a typical naturally ventilated home in winter. */
export const INDOOR_RATIO = 0.7;
/** Ratio after sealing door and window gaps. */
export const SEALED_INDOOR_RATIO = 0.55;
/** Fraction of indoor PM2.5 removed in a closed room by a right-sized HEPA purifier. */
export const HEPA_REDUCTION = 0.5;
/** Same for a DIY box-fan + MERV-13 filter (Corsi–Rosenthal box). */
export const DIY_FILTER_REDUCTION = 0.4;
/** Real-world reduction from a well-fitted N95/FFP2 respirator. */
export const N95_REDUCTION = 0.8;
export const HOURS_AT_HOME = 14;
export const WORKDAYS_PER_WEEK = 5;
/** kg CO₂ per litre of petrol burned. */
export const CO2_PER_LITRE_PETROL = 2.31;

interface ModeProfile {
  label: string;
  /** kg CO₂ per passenger-km. */
  co2PerKm: number;
  /** g PM2.5 per passenger-km, exhaust plus brake, tyre and road dust. */
  pmPerKm: number;
  /** Average door-to-door speed, km/h. */
  speedKmh: number;
  /** Commuter exposure relative to the city's ambient PM2.5. */
  exposureFactor: number;
  /** Breathing rate while travelling, m³/h. */
  ventilation: number;
}

export const MODES: Record<CommuteMode, ModeProfile> = {
  car: { label: "car", co2PerKm: 0.17, pmPerKm: 0.025, speedKmh: 25, exposureFactor: 0.8, ventilation: 0.5 },
  "two-wheeler": {
    label: "two-wheeler",
    co2PerKm: 0.045,
    pmPerKm: 0.015,
    speedKmh: 28,
    exposureFactor: 1.3,
    ventilation: 0.9,
  },
  auto: { label: "auto-rickshaw", co2PerKm: 0.07, pmPerKm: 0.02, speedKmh: 20, exposureFactor: 1.3, ventilation: 0.7 },
  bus: { label: "bus", co2PerKm: 0.04, pmPerKm: 0.005, speedKmh: 18, exposureFactor: 1.1, ventilation: 0.7 },
  metro: { label: "metro", co2PerKm: 0.02, pmPerKm: 0.001, speedKmh: 32, exposureFactor: 0.6, ventilation: 0.6 },
  "walk-cycle": {
    label: "walking or cycling",
    co2PerKm: 0,
    pmPerKm: 0,
    speedKmh: 10,
    exposureFactor: 1.2,
    ventilation: 1.5,
  },
  home: { label: "working from home", co2PerKm: 0, pmPerKm: 0, speedKmh: 1, exposureFactor: 0, ventilation: 0 },
};

/** Idle fuel burn, litres per hour. */
export const IDLE_LITRES_PER_HOUR: Partial<Record<CommuteMode, number>> = { car: 0.7, "two-wheeler": 0.15, auto: 0.3 };

/* ---------- Types ---------- */

export type ActionKind = "routine" | "indoor" | "swap";

export interface Impact {
  /** µg of PM2.5 kept out of the household's lungs per day. */
  lungsUgPerDay: number;
  /** kg CO₂ avoided per week. */
  co2KgPerWeek: number;
  /** g of PM2.5 the household stops putting into the city's air per week. */
  smogGPerWeek: number;
  /** Plain-language description of how the number was worked out. */
  basis: string;
}

export interface ImpactContext {
  household: Household;
  air: AirSnapshot;
  clean: BreathWindow | null;
  worst: BreathWindow | null;
}

export interface ActionDefinition {
  id: string;
  kind: ActionKind;
  title: string;
  /**
   * Actions in the same group are alternatives (you would do one of them),
   * so totals count only the strongest one in each group.
   */
  group?: "commute";
  /** Default how-to steps used when the model is unavailable. */
  steps: string[];
  /** Default reason used when the model is unavailable. */
  why: string;
  applies: (ctx: ImpactContext) => boolean;
  impact: (ctx: ImpactContext) => Impact;
}

/* ---------- Helpers ---------- */

export const round = (n: number, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(Math.max(0, n) * f) / f;
};

export function people(h: Household): number {
  return h.adults + h.children + h.elders;
}

export function indoorPm(ctx: ImpactContext): number {
  const purifier = ctx.household.hasPurifier ? 1 - HEPA_REDUCTION : 1;
  return ctx.air.pm25 * INDOOR_RATIO * purifier;
}

/** PM2.5 forecast for a given local hour today (falls back to the current reading). */
export function pmAtHour(air: AirSnapshot, hour: number): number {
  const match = air.hourly.find((r) => Number.parseInt(r.time.slice(11, 13), 10) === hour);
  return match ? match.pm25 : air.pm25;
}

export function commuteHoursPerDay(h: Household, mode: CommuteMode = h.commuteMode): number {
  if (mode === "home" || h.commuteKm === 0) return 0;
  return (2 * h.commuteKm) / MODES[mode].speedKmh;
}

export function commuteDose(h: Household, pm: number, mode: CommuteMode = h.commuteMode): number {
  const m = MODES[mode];
  return commuteHoursPerDay(h, mode) * m.ventilation * pm * m.exposureFactor;
}

export const EXPOSED_MODES: CommuteMode[] = ["two-wheeler", "auto", "bus", "walk-cycle"];
export const PRIVATE_MOTOR: CommuteMode[] = ["car", "two-wheeler", "auto"];
export const commutes = (h: Household) => h.commuteMode !== "home" && h.commuteKm > 0;
