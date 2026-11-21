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

function rulesRoutine(ctx: ImpactContext, ids: Set<string>): RoutineStep[] {
  const steps: RoutineStep[] = [];
  const clean = ctx.clean;
  const cleanTime = clean ? hhmm(clean.start) : "14:00";
  const cleanLabel = clean ? `${formatHour(clean.start)}–${formatHour(clean.end)}` : "the afternoon";

  steps.push({
    time: "06:30",
    title: "Keep windows shut through the morning",
    detail: "Cold mornings trap smog close to the ground; it usually eases by late morning.",
    actionId: "",
  });
  if (ids.has("exercise-clean-window")) {
    steps.push({
      time: ctx.air.aqi > 150 ? "07:00" : cleanTime,
      title: ctx.air.aqi > 150 ? "Work out indoors" : "Exercise in the clean window",
      detail: ctx.air.aqi > 150 ? "Yoga or strength work with windows closed." : `Outside is cleanest ${cleanLabel}.`,
      actionId: "exercise-clean-window",
    });
  }
  if (ids.has("n95-outdoors")) {
    steps.push({
      time: "08:30",
      title: "N95 on before you leave",
      detail: "Check the seal at your nose; keep it on while waiting at stops.",
      actionId: "n95-outdoors",
    });
  } else if (ctx.household.commuteMode === "car" && ctx.household.commuteKm > 0) {
    steps.push({
      time: "08:30",
      title: "Drive with windows up on recirculate",
      detail: "Recirculated cabin air keeps out much of the exhaust in traffic.",
      actionId: "",
    });
  }
  steps.push({
    time: cleanTime,
    title: "Air out the house for 15 minutes",
    detail: `Open windows wide ${cleanLabel}, then close up again.`,
    actionId: ids.has("air-out-clean-window") ? "air-out-clean-window" : "",
  });
  if (ctx.household.children > 0) {
    steps.push({
      time: "17:00",
      title: "Indoor play for the kids",
      detail: "Evening smog builds fast after sunset; save outdoor play for the clean window.",
      actionId: ids.has("kids-indoor-play") ? "kids-indoor-play" : "",
    });
  }
  steps.push({
    time: "21:30",
    title: ctx.household.hasPurifier ? "Purifier on, bedroom door shut" : "Filter fan on, bedroom door shut",
    detail: "A sealed, filtered bedroom gives everyone 8 hours of cleaner air.",
    actionId: ctx.household.hasPurifier ? "hepa-bedroom" : "diy-filter-fan",
  });
  return steps.sort((a, b) => a.time.localeCompare(b.time)).slice(0, MAX_ROUTINE);
}

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
