import {
  VENTILATION,
  WORKDAYS_PER_WEEK,
  CO2_PER_LITRE_PETROL,
  MODES,
  IDLE_LITRES_PER_HOUR,
  round,
  people,
  commuteDose,
  PRIVATE_MOTOR,
  commutes,
  type ActionDefinition,
} from "../exposure";

/** Lower-emission swaps: choices that leave less smog for everyone. */
export const SWAP_ACTIONS: readonly ActionDefinition[] = [
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
