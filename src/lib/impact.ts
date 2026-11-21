import type { AirSnapshot, CommuteMode, Household } from "./schemas";
import { findCleanestWindow, findWorstWindow, type BreathWindow } from "./breathWindow";

/**
 * Deterministic impact model. The language model chooses and explains actions;
 * every number the user sees is computed here so it is reproducible and testable.
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
const IDLE_LITRES_PER_HOUR: Partial<Record<CommuteMode, number>> = { car: 0.7, "two-wheeler": 0.15, auto: 0.3 };

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

const round = (n: number, digits = 0) => {
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

function commuteDose(h: Household, pm: number, mode: CommuteMode = h.commuteMode): number {
  const m = MODES[mode];
  return commuteHoursPerDay(h, mode) * m.ventilation * pm * m.exposureFactor;
}

const EXPOSED_MODES: CommuteMode[] = ["two-wheeler", "auto", "bus", "walk-cycle"];
const PRIVATE_MOTOR: CommuteMode[] = ["car", "two-wheeler", "auto"];
const commutes = (h: Household) => h.commuteMode !== "home" && h.commuteKm > 0;

/* ---------- Action catalogue ---------- */

export const ACTIONS: readonly ActionDefinition[] = [
  {
    id: "exercise-clean-window",
    kind: "routine",
    title: "Move your workout to the cleanest hours",
    why: "Exercise multiplies how much air you breathe, so timing matters more than for any other activity.",
    steps: [
      "Check the clean-air window on the ribbon above.",
      "If it is still above 150, work out indoors with windows shut instead.",
      "Swap high-intensity runs for yoga or strength work on the worst days.",
    ],
    applies: (ctx) => ctx.household.exercise !== "none",
    impact: (ctx) => {
      const usualHour = ctx.household.exercise === "morning" ? 7 : 18;
      const usualPm = pmAtHour(ctx.air, usualHour);
      const alternative = Math.min(ctx.clean?.averagePm25 ?? usualPm, indoorPm(ctx));
      return {
        lungsUgPerDay: round(VENTILATION.exercise * (usualPm - alternative)),
        co2KgPerWeek: 0,
        smogGPerWeek: 0,
        basis: `1 hour of exercise at ${VENTILATION.exercise} m³/h, moved from ${round(usualPm)} to ${round(alternative)} µg/m³.`,
      };
    },
  },
  {
    id: "n95-outdoors",
    kind: "routine",
    title: "Wear a well-fitted N95 on the road",
    why: "Open-air commutes put you right next to exhaust, where PM2.5 runs well above the city average.",
    steps: [
      "Use an N95 or FFP2 with a nose clip, not a cloth or surgical mask.",
      "Press the clip to your nose and check for air leaking at the edges.",
      "Replace it when breathing through it gets harder or it gets damp.",
    ],
    applies: (ctx) => commutes(ctx.household) && EXPOSED_MODES.includes(ctx.household.commuteMode),
    impact: (ctx) => {
      const dose = commuteDose(ctx.household, ctx.air.pm25);
      return {
        lungsUgPerDay: round(dose * N95_REDUCTION),
        co2KgPerWeek: 0,
        smogGPerWeek: 0,
        basis: `${round(commuteHoursPerDay(ctx.household), 1)} h of commuting a day; a fitted N95 filters about ${N95_REDUCTION * 100}% of what you would breathe.`,
      };
    },
  },
  {
    id: "kids-indoor-play",
    kind: "routine",
    title: "Keep children's play to the clean window",
    why: "Children breathe more air per kilo of body weight and their lungs are still developing.",
    steps: [
      "Schedule outdoor play inside the clean-air window, or keep it indoors.",
      "Skip the school-gate wait in heavy traffic; arrive just in time.",
      "Plan an indoor game for the evening, when smog usually settles in.",
    ],
    applies: (ctx) => ctx.household.children > 0,
    impact: (ctx) => {
      const eveningPm = pmAtHour(ctx.air, 17);
      const alternative = Math.min(ctx.clean?.averagePm25 ?? eveningPm, indoorPm(ctx));
      return {
        lungsUgPerDay: round(VENTILATION.play * (eveningPm - alternative) * ctx.household.children),
        co2KgPerWeek: 0,
        smogGPerWeek: 0,
        basis: `1 hour of play for ${ctx.household.children} child(ren) at ${VENTILATION.play} m³/h, moved away from the evening peak.`,
      };
    },
  },
  {
    id: "air-out-clean-window",
    kind: "routine",
    title: "Air out the house only during the clean window",
    why: "Opening windows during the peak pulls smog inside, where it lingers for hours.",
    steps: [
      "Keep windows shut through the early morning and late evening.",
      "Open them wide for 15 minutes in the clean window to clear stale air and CO₂.",
      "Close up again before the evening rush hour.",
    ],
    applies: (ctx) => ctx.clean !== null && ctx.worst !== null,
    impact: (ctx) => {
      const gap = (ctx.worst?.averagePm25 ?? 0) - (ctx.clean?.averagePm25 ?? 0);
      return {
        lungsUgPerDay: round(gap * INDOOR_RATIO * VENTILATION.rest * 2 * people(ctx.household)),
        co2KgPerWeek: 0,
        smogGPerWeek: 0,
        basis: `Avoids about 2 hours of peak air drifting indoors for ${people(ctx.household)} people.`,
      };
    },
  },
  {
    id: "hepa-bedroom",
    kind: "indoor",
    title: "Run your purifier where you sleep",
    why: "You spend a third of the day asleep; one clean room protects more breathing hours than any other.",
    steps: [
      "Put the purifier in the bedroom and close the door an hour before bed.",
      "Run it on high while the room is empty, then a quieter setting overnight.",
      "Check the filter every month in smog season.",
    ],
    applies: (ctx) => ctx.household.hasPurifier,
    impact: (ctx) => {
      const before = ctx.air.pm25 * INDOOR_RATIO;
      return {
        lungsUgPerDay: round(8 * VENTILATION.rest * before * HEPA_REDUCTION * people(ctx.household)),
        co2KgPerWeek: 0,
        smogGPerWeek: 0,
        basis: `8 hours of sleep for ${people(ctx.household)} people with indoor PM2.5 cut by about ${HEPA_REDUCTION * 100}%.`,
      };
    },
  },
  {
    id: "diy-filter-fan",
    kind: "indoor",
    title: "Build a box-fan air filter",
    why: "A box fan with MERV-13 furnace filters taped to it cleans a bedroom almost as well as a commercial purifier, for a fraction of the price.",
    steps: [
      "Tape four MERV-13 (or higher) filters into a cube, airflow arrows pointing inward.",
      "Tape a box fan on top, blowing outward, and seal the gaps.",
      "Run it in the bedroom with the door closed.",
    ],
    applies: (ctx) => !ctx.household.hasPurifier,
    impact: (ctx) => {
      const before = ctx.air.pm25 * INDOOR_RATIO;
      return {
        lungsUgPerDay: round(8 * VENTILATION.rest * before * DIY_FILTER_REDUCTION * people(ctx.household)),
        co2KgPerWeek: 0,
        smogGPerWeek: 0,
        basis: `8 hours of sleep for ${people(ctx.household)} people with indoor PM2.5 cut by about ${DIY_FILTER_REDUCTION * 100}%.`,
      };
    },
  },
  {
    id: "seal-gaps",
    kind: "indoor",
    title: "Seal the gaps around doors and windows",
    why: "Most indoor smog leaks in through gaps; sealing them lowers the baseline in every room.",
    steps: [
      "Fit adhesive foam strips along window frames and door edges.",
      "Use a door snake or rolled towel under the main door.",
      "Keep the kitchen and bathroom exhausts for venting, not open windows.",
    ],
    applies: () => true,
    impact: (ctx) => ({
      lungsUgPerDay: round(
        HOURS_AT_HOME * VENTILATION.rest * ctx.air.pm25 * (INDOOR_RATIO - SEALED_INDOOR_RATIO) * people(ctx.household),
      ),
      co2KgPerWeek: 0,
      smogGPerWeek: 0,
      basis: `Indoor/outdoor ratio from ${INDOOR_RATIO} to ${SEALED_INDOOR_RATIO} over ${HOURS_AT_HOME} hours at home.`,
    }),
  },
  {
    id: "no-indoor-smoke",
    kind: "indoor",
    title: "Skip incense, mosquito coils and candles",
    why: "A single mosquito coil can give off as much fine particulate as dozens of cigarettes, all of it trapped inside.",
    steps: [
      "Use mesh screens or a plug-in repellent instead of coils.",
      "Light a diya or incense briefly near an open window, then put it out.",
      "Never smoke indoors; the particles settle into fabric and dust.",
    ],
    applies: () => true,
    impact: (ctx) => ({
      // One burning session lifts a room by roughly 100 µg/m³ for about 2 hours.
      lungsUgPerDay: round(2 * VENTILATION.rest * 100 * people(ctx.household)),
      co2KgPerWeek: 0,
      smogGPerWeek: 0,
      basis: "One coil or incense session adds about 100 µg/m³ to a room for 2 hours.",
    }),
  },
  {
    id: "wet-clean",
    kind: "indoor",
    title: "Mop instead of sweeping",
    why: "Dry sweeping kicks settled particles back into the air you breathe.",
    steps: [
      "Use a damp mop or cloth on floors and sills.",
      "Wipe fan blades and window ledges weekly.",
      "Vacuum only with a HEPA-filter vacuum.",
    ],
    applies: () => true,
    impact: (ctx) => ({
      lungsUgPerDay: round(HOURS_AT_HOME * VENTILATION.rest * indoorPm(ctx) * 0.05 * people(ctx.household)),
      co2KgPerWeek: 0,
      smogGPerWeek: 0,
      basis: "Avoids roughly 5% of indoor PM2.5 from resuspended dust.",
    }),
  },
  {
    id: "kitchen-ventilation",
    kind: "indoor",
    title: "Cook with the lid on and the exhaust running",
    why: "Frying and tempering release a burst of fine particles; venting them at the source stops them spreading.",
    steps: [
      "Switch on the chimney or exhaust fan before you start, and leave it on 10 minutes after.",
      "Cover pans while frying and tadka-ing.",
      "Keep the kitchen door shut while cooking.",
    ],
    applies: (ctx) => ctx.household.cookingFuel !== "biomass",
    impact: (ctx) => ({
      lungsUgPerDay: round(1 * VENTILATION.light * 60 * Math.max(1, ctx.household.adults - 1)),
      co2KgPerWeek: 0,
      smogGPerWeek: 0,
      basis: "Cuts a typical 60 µg/m³ cooking spike for 1 hour for whoever is in the kitchen.",
    }),
  },
  {
    id: "switch-to-transit",
    kind: "swap",
    group: "commute",
    title: "Take the metro or bus to work",
    why: "Private vehicles are a leading source of winter smog, and your share drops sharply on shared transit.",
    steps: [
      "Try public transit for two days this week and time it honestly.",
      "Pair it with a shared auto or cycle for the last stretch.",
      "Keep an N95 for waiting at stops.",
    ],
    applies: (ctx) => commutes(ctx.household) && PRIVATE_MOTOR.includes(ctx.household.commuteMode),
    impact: (ctx) => {
      const h = ctx.household;
      const from = MODES[h.commuteMode];
      const to = MODES.metro;
      const weeklyKm = 2 * h.commuteKm * WORKDAYS_PER_WEEK;
      return {
        lungsUgPerDay: round(commuteDose(h, ctx.air.pm25) - commuteDose(h, ctx.air.pm25, "metro")),
        co2KgPerWeek: round(weeklyKm * (from.co2PerKm - to.co2PerKm), 1),
        smogGPerWeek: round(weeklyKm * (from.pmPerKm - to.pmPerKm), 1),
        basis: `${weeklyKm} km a week moved from ${from.label} to metro.`,
      };
    },
  },
  {
    id: "carpool",
    kind: "swap",
    group: "commute",
    title: "Share the car with two colleagues",
    why: "Three people in one car cut the per-person emissions of your commute by two-thirds.",
    steps: [
      "Ask in your office or neighbourhood group who shares your route.",
      "Agree on fixed pick-up times so it sticks.",
      "Rotate cars weekly so nobody carries the whole cost.",
    ],
    applies: (ctx) => commutes(ctx.household) && ctx.household.commuteMode === "car",
    impact: (ctx) => {
      const weeklyKm = 2 * ctx.household.commuteKm * WORKDAYS_PER_WEEK;
      return {
        lungsUgPerDay: 0,
        co2KgPerWeek: round(weeklyKm * MODES.car.co2PerKm * (2 / 3), 1),
        smogGPerWeek: round(weeklyKm * MODES.car.pmPerKm * (2 / 3), 1),
        basis: `Your ${weeklyKm} km a week split three ways.`,
      };
    },
  },
  {
    id: "work-from-home-peak",
    kind: "swap",
    group: "commute",
    title: "Work from home on the worst day",
    why: "On severe days, the trip you don't make is both the cleanest and the safest one.",
    steps: [
      "Check the forecast each evening; plan home days when it tops 200.",
      "Batch meetings that need you in person onto cleaner days.",
      "Keep your home-office room filtered.",
    ],
    applies: (ctx) => commutes(ctx.household) && ctx.air.aqi > 150,
    impact: (ctx) => {
      const h = ctx.household;
      const m = MODES[h.commuteMode];
      const dailyKm = 2 * h.commuteKm;
      return {
        lungsUgPerDay: round(commuteDose(h, ctx.air.pm25) / WORKDAYS_PER_WEEK),
        co2KgPerWeek: round(dailyKm * m.co2PerKm, 1),
        smogGPerWeek: round(dailyKm * m.pmPerKm, 1),
        basis: `One ${dailyKm} km round trip skipped each week.`,
      };
    },
  },
  {
    id: "engine-off-idle",
    kind: "swap",
    title: "Switch off at long red lights",
    why: "Idling engines pump exhaust straight into the street at nose height for pedestrians and riders.",
    steps: [
      "Turn the engine off at signals longer than 10 seconds.",
      "Use the signal countdown timers where they exist.",
      "Skip warming up the engine; modern engines do not need it.",
    ],
    applies: (ctx) => commutes(ctx.household) && ctx.household.commuteMode in IDLE_LITRES_PER_HOUR,
    impact: (ctx) => {
      const litresPerHour = IDLE_LITRES_PER_HOUR[ctx.household.commuteMode] ?? 0;
      const idleHoursPerWeek = (10 / 60) * WORKDAYS_PER_WEEK;
      return {
        lungsUgPerDay: 0,
        co2KgPerWeek: round(litresPerHour * idleHoursPerWeek * CO2_PER_LITRE_PETROL, 1),
        smogGPerWeek: round(idleHoursPerWeek * 2, 1),
        basis: "About 10 minutes of idling a day avoided.",
      };
    },
  },
  {
    id: "clean-heating",
    kind: "swap",
    title: "Replace the wood, coal or kerosene heater",
    why: "Burning fuel indoors for warmth is one of the largest sources of both indoor and neighbourhood smoke.",
    steps: [
      "Heat one room with an electric oil-filled heater and close it off.",
      "Layer up: thermal innerwear and a warm cap hold heat well.",
      "If you must burn, use a chimney-vented stove, never an open brazier.",
    ],
    applies: (ctx) => ctx.household.heating === "wood-coal" || ctx.household.heating === "kerosene",
    impact: (ctx) => ({
      lungsUgPerDay: round(4 * VENTILATION.rest * 60 * people(ctx.household)),
      co2KgPerWeek: ctx.household.heating === "kerosene" ? round(0.5 * 7 * 2.5, 1) : 0,
      smogGPerWeek: ctx.household.heating === "wood-coal" ? round(3 * 7 * 10) : round(0.5 * 7 * 2),
      basis: "Removes a 60 µg/m³ indoor spike for 4 hours of heating, and the smoke vented outside.",
    }),
  },
  {
    id: "clean-cooking",
    kind: "swap",
    title: "Move cooking from wood or dung to LPG or induction",
    why: "Solid-fuel kitchens routinely reach hundreds of µg/m³; the cook and small children breathe most of it.",
    steps: [
      "Check eligibility for a subsidised LPG connection in your area.",
      "Start with daily items like tea and rice on gas or induction.",
      "Keep any remaining solid-fuel cooking outdoors and downwind.",
    ],
    applies: (ctx) => ctx.household.cookingFuel === "biomass",
    impact: () => ({
      lungsUgPerDay: round(3 * VENTILATION.light * 400),
      co2KgPerWeek: 0,
      smogGPerWeek: round(2 * 7 * 8),
      basis: "3 hours a day out of a 400 µg/m³ kitchen; about 2 kg of solid fuel a day not burned.",
    }),
  },
  {
    id: "never-burn",
    kind: "swap",
    title: "Never burn leaves or rubbish, and report it",
    why: "Open burning sends smoke straight into the air your street breathes overnight.",
    steps: [
      "Compost leaves or hand them to municipal collection.",
      "Report open burning through your city's pollution complaint line or app.",
      "Talk to your residents' association about a no-burning pledge.",
    ],
    applies: () => true,
    impact: () => ({
      lungsUgPerDay: 0,
      co2KgPerWeek: 0,
      smogGPerWeek: round(1 * 8),
      basis: "About 1 kg of waste a week not burned in the open.",
    }),
  },
];

export const ACTION_IDS = ACTIONS.map((a) => a.id);

export function getAction(id: string): ActionDefinition | undefined {
  return ACTIONS.find((a) => a.id === id);
}

export function buildContext(household: Household, air: AirSnapshot): ImpactContext {
  return {
    household,
    air,
    clean: findCleanestWindow(air.hourly),
    worst: findWorstWindow(air.hourly),
  };
}

export interface Candidate {
  id: string;
  kind: ActionKind;
  group?: string;
  title: string;
  impact: Impact;
}

/** Applicable actions with computed impact, highest personal benefit first. */
export function candidateActions(ctx: ImpactContext): Candidate[] {
  return ACTIONS.filter((a) => a.applies(ctx))
    .map((a) => ({ id: a.id, kind: a.kind, group: a.group, title: a.title, impact: a.impact(ctx) }))
    .sort((a, b) => score(b.impact) - score(a.impact));
}

/** Weighs lungs, climate and smog roughly equally for ranking. */
export function score(i: Impact): number {
  return i.lungsUgPerDay / 100 + i.co2KgPerWeek / 5 + i.smogGPerWeek / 5;
}

/**
 * Sums impacts, counting only the strongest action within each group of
 * alternatives so that, say, "take the metro" and "carpool" are not added up.
 */
export function totalImpact(items: { impact: Impact; group?: string }[]): Omit<Impact, "basis"> {
  const bestInGroup = new Map<string, Impact>();
  const counted: Impact[] = [];
  for (const { impact, group } of items) {
    if (!group) {
      counted.push(impact);
      continue;
    }
    const current = bestInGroup.get(group);
    if (!current || score(impact) > score(current)) bestInGroup.set(group, impact);
  }
  counted.push(...bestInGroup.values());
  return counted.reduce(
    (t, i) => ({
      lungsUgPerDay: round(t.lungsUgPerDay + i.lungsUgPerDay),
      co2KgPerWeek: round(t.co2KgPerWeek + i.co2KgPerWeek, 1),
      smogGPerWeek: round(t.smogGPerWeek + i.smogGPerWeek, 1),
    }),
    { lungsUgPerDay: 0, co2KgPerWeek: 0, smogGPerWeek: 0 },
  );
}

/**
 * A day of breathing at rest is ~12 m³ of air; 22 µg/m³ for a day ≈ 1 cigarette.
 * So ~264 µg of inhaled PM2.5 is roughly one cigarette's worth.
 */
export const UG_PER_CIGARETTE = 22 * 12;

export function cigarettesAvoided(lungsUgPerDay: number): number {
  return Math.round((lungsUgPerDay / UG_PER_CIGARETTE) * 10) / 10;
}

export const METHOD_NOTES = [
  "Breathing rates: US EPA Exposure Factors Handbook (ch. 6).",
  "Cigarette equivalence: Berkeley Earth, 22 µg/m³ of PM2.5 for a day ≈ 1 cigarette.",
  "N95 real-world fit and box-fan filter performance: published lab and field studies, rounded down.",
  "Transport emission factors: typical Indian urban values, rounded; your vehicle will differ.",
  "All figures are estimates to compare options, not medical measurements.",
] as const;
