import {
  VENTILATION,
  INDOOR_RATIO,
  N95_REDUCTION,
  round,
  people,
  indoorPm,
  pmAtHour,
  commuteHoursPerDay,
  commuteDose,
  EXPOSED_MODES,
  commutes,
  type ActionDefinition,
} from "../exposure";
import { EVENING_EXERCISE_HOUR, EVENING_PLAY_HOUR, MORNING_EXERCISE_HOUR, PEAK_HOURS_KEPT_OUT } from "../assumptions";

/** Daily-routine actions: when and how to be outside. */
export const ROUTINE_ACTIONS: readonly ActionDefinition[] = [
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
      const usualHour = ctx.household.exercise === "morning" ? MORNING_EXERCISE_HOUR : EVENING_EXERCISE_HOUR;
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
      const eveningPm = pmAtHour(ctx.air, EVENING_PLAY_HOUR);
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
        lungsUgPerDay: round(gap * INDOOR_RATIO * VENTILATION.rest * PEAK_HOURS_KEPT_OUT * people(ctx.household)),
        co2KgPerWeek: 0,
        smogGPerWeek: 0,
        basis: `Avoids about ${PEAK_HOURS_KEPT_OUT} hours of peak air drifting indoors for ${people(ctx.household)} people.`,
      };
    },
  },
];
