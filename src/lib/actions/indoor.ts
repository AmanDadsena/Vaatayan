import {
  VENTILATION,
  INDOOR_RATIO,
  SEALED_INDOOR_RATIO,
  HEPA_REDUCTION,
  DIY_FILTER_REDUCTION,
  HOURS_AT_HOME,
  round,
  people,
  indoorPm,
  type ActionDefinition,
} from "../exposure";

/** Typical daily cooking time with the stove on, in hours. */
const COOKING_HOURS = 1;

/** Indoor-air actions: making home the cleanest air you breathe. */
export const INDOOR_ACTIONS: readonly ActionDefinition[] = [
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
      lungsUgPerDay: round(COOKING_HOURS * VENTILATION.light * 60 * Math.max(1, ctx.household.adults - 1)),
      co2KgPerWeek: 0,
      smogGPerWeek: 0,
      basis: "Cuts a typical 60 µg/m³ cooking spike for 1 hour for whoever is in the kitchen.",
    }),
  },
];
