import { categorize } from "../aqi";
import { formatHour } from "../breathWindow";
import { candidateActions, type ImpactContext } from "../impact";
import { MAX_ROUTINE, clip, hhmm, toItem, defaultSelection, finalize, type RoutineStep, type Plan } from "./core";

/** The rule-based planner: a complete plan from the deterministic model, no AI needed. */

function careNoteFor(ctx: ImpactContext): string {
  const { household: h, air } = ctx;
  const notes: string[] = [];
  if (h.conditions.includes("asthma-copd"))
    notes.push("Keep reliever inhalers within reach and follow your asthma action plan if symptoms rise.");
  if (h.conditions.includes("heart"))
    notes.push(
      "Heart conditions make fine particles riskier; avoid exertion outdoors and watch for chest pain or breathlessness.",
    );
  if (h.conditions.includes("pregnancy"))
    notes.push("During pregnancy, keep outdoor time short on high-AQI days and sleep in the filtered room.");
  if (h.children > 0 && air.aqi > 100) notes.push("Children should play indoors or only inside the clean-air window.");
  if (h.elders > 0 && air.aqi > 100)
    notes.push("Older family members should take walks indoors or in the clean window.");
  return notes.join(" ");
}

/** Above this AQI even the cleanest window is too dirty for a workout outside. */
const INDOOR_WORKOUT_AQI = 150;

/** When and how to describe today's clean-air window, with a mid-afternoon fallback. */
interface CleanSlot {
  time: string;
  label: string;
}

type StepMaker = (ctx: ImpactContext, ids: Set<string>, slot: CleanSlot) => RoutineStep | null;

/** Links a step to its action only when that action made it into the plan. */
const linked = (ids: Set<string>, id: string) => (ids.has(id) ? id : "");

const morning: StepMaker = () => ({
  time: "06:30",
  title: "Keep windows shut through the morning",
  detail: "Cold mornings trap smog close to the ground; it usually eases by late morning.",
  actionId: "",
});

const exercise: StepMaker = (ctx, ids, slot) => {
  if (!ids.has("exercise-clean-window")) return null;
  const indoors = ctx.air.aqi > INDOOR_WORKOUT_AQI;
  return {
    time: indoors ? "07:00" : slot.time,
    title: indoors ? "Work out indoors" : "Exercise in the clean window",
    detail: indoors ? "Yoga or strength work with windows closed." : `Outside is cleanest ${slot.label}.`,
    actionId: "exercise-clean-window",
  };
};

const commute: StepMaker = (ctx, ids) => {
  if (ids.has("n95-outdoors")) {
    return {
      time: "08:30",
      title: "N95 on before you leave",
      detail: "Check the seal at your nose; keep it on while waiting at stops.",
      actionId: "n95-outdoors",
    };
  }
  if (ctx.household.commuteMode !== "car" || ctx.household.commuteKm <= 0) return null;
  return {
    time: "08:30",
    title: "Drive with windows up on recirculate",
    detail: "Recirculated cabin air keeps out much of the exhaust in traffic.",
    actionId: "",
  };
};

const airOut: StepMaker = (_ctx, ids, slot) => ({
  time: slot.time,
  title: "Air out the house for 15 minutes",
  detail: `Open windows wide ${slot.label}, then close up again.`,
  actionId: linked(ids, "air-out-clean-window"),
});

const kidsPlay: StepMaker = (ctx, ids) =>
  ctx.household.children > 0
    ? {
        time: "17:00",
        title: "Indoor play for the kids",
        detail: "Evening smog builds fast after sunset; save outdoor play for the clean window.",
        actionId: linked(ids, "kids-indoor-play"),
      }
    : null;

const bedtime: StepMaker = (ctx) => ({
  time: "21:30",
  title: ctx.household.hasPurifier ? "Purifier on, bedroom door shut" : "Filter fan on, bedroom door shut",
  detail: "A sealed, filtered bedroom gives everyone 8 hours of cleaner air.",
  actionId: ctx.household.hasPurifier ? "hepa-bedroom" : "diy-filter-fan",
});

const DAY: readonly StepMaker[] = [morning, exercise, commute, airOut, kidsPlay, bedtime];

/** The day's routine without a model: fixed anchors, plus steps for the actions that were chosen. */
function rulesRoutine(ctx: ImpactContext, ids: Set<string>): RoutineStep[] {
  const slot: CleanSlot = ctx.clean
    ? { time: hhmm(ctx.clean.start), label: `${formatHour(ctx.clean.start)}–${formatHour(ctx.clean.end)}` }
    : { time: "14:00", label: "the afternoon" };
  return DAY.map((make) => make(ctx, ids, slot))
    .filter((step): step is RoutineStep => step !== null)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, MAX_ROUTINE);
}

/** A complete plan from the built-in rules; used when no AI key is set or the model fails. */
export function buildRulePlan(ctx: ImpactContext): Plan {
  const candidates = candidateActions(ctx);
  const selected = defaultSelection(candidates);
  const items = selected.map((c) => toItem(c));
  const category = categorize(ctx.air.aqi);
  const top = items[0];
  const windowText = ctx.clean
    ? ` The cleanest stretch today is ${formatHour(ctx.clean.start)}–${formatHour(ctx.clean.end)} (AQI about ${ctx.clean.averageAqi}).`
    : "";

  return finalize(ctx, "rules", {
    headline: top ? clip(`Start with this: ${top.title.toLowerCase()}.`, 140) : "Your air looks fine today.",
    summary: `Air is ${category.label.toLowerCase()} right now (US AQI ${Math.round(ctx.air.aqi)}). ${category.advice}${windowText}`,
    careNote: careNoteFor(ctx),
    routine: rulesRoutine(ctx, new Set(items.map((i) => i.id))),
    items,
  });
}
