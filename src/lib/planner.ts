import { categorize } from "./aqi";
import { formatHour, type BreathWindow } from "./breathWindow";
import {
  candidateActions,
  cigarettesAvoided,
  getAction,
  totalImpact,
  type ActionKind,
  type Candidate,
  type Impact,
  type ImpactContext,
} from "./impact";
import type { ModelPlan } from "./schemas";

export interface PlanItem {
  id: string;
  kind: ActionKind;
  group?: string;
  title: string;
  why: string;
  steps: string[];
  impact: Impact;
}

export interface RoutineStep {
  time: string;
  title: string;
  detail: string;
  actionId: string;
}

export interface Plan {
  source: "ai" | "rules";
  headline: string;
  summary: string;
  careNote: string;
  routine: RoutineStep[];
  items: PlanItem[];
  totals: Omit<Impact, "basis">;
  cigarettesAvoidedPerDay: number;
  cleanWindow: BreathWindow | null;
  worstWindow: BreathWindow | null;
}

export const MAX_ITEMS = 8;
export const MIN_ITEMS = 4;
const MAX_ROUTINE = 7;

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s).trim();
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const hhmm = (time: string) => time.slice(11, 16);

function toItem(candidate: Candidate, why?: string, steps?: string[]): PlanItem {
  const def = getAction(candidate.id);
  const cleanSteps = (steps ?? [])
    .map((s) => clip(s, 160))
    .filter(Boolean)
    .slice(0, 3);
  return {
    id: candidate.id,
    kind: candidate.kind,
    group: candidate.group,
    title: candidate.title,
    why: clip(why?.trim() || def?.why || "", 280),
    steps: cleanSteps.length >= 2 ? cleanSteps : (def?.steps ?? []),
    impact: candidate.impact,
  };
}

/** Picks a balanced default set: best per kind first, then by score. */
export function defaultSelection(candidates: Candidate[], max = 6): Candidate[] {
  const chosen: Candidate[] = [];
  for (const kind of ["routine", "indoor", "swap"] as const) {
    const top = candidates.find((c) => c.kind === kind);
    if (top) chosen.push(top);
  }
  for (const c of candidates) {
    if (chosen.length >= max) break;
    if (!chosen.includes(c)) chosen.push(c);
  }
  const order = new Map(candidates.map((c, i) => [c.id, i]));
  return chosen.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

function finalize(
  ctx: ImpactContext,
  source: Plan["source"],
  parts: Pick<Plan, "headline" | "summary" | "careNote" | "routine" | "items">,
): Plan {
  const totals = totalImpact(parts.items);
  return {
    source,
    ...parts,
    totals,
    cigarettesAvoidedPerDay: cigarettesAvoided(totals.lungsUgPerDay),
    cleanWindow: ctx.clean,
    worstWindow: ctx.worst,
  };
}

/* ---------- Rule-based planner (no model needed) ---------- */

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

/* ---------- Merge model output with the deterministic model ---------- */

/**
 * Trusts the model only for wording and selection. Unknown or inapplicable
 * action ids are dropped, duplicates removed, and impact numbers always come
 * from the deterministic model.
 */
export function mergeModelPlan(ctx: ImpactContext, model: ModelPlan): Plan {
  const candidates = candidateActions(ctx);
  const byId = new Map(candidates.map((c) => [c.id, c]));

  const seen = new Set<string>();
  const items: PlanItem[] = [];
  for (const pick of model.picks) {
    const candidate = byId.get(pick.actionId);
    if (!candidate || seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    items.push(toItem(candidate, pick.why, pick.steps));
    if (items.length >= MAX_ITEMS) break;
  }
  for (const c of defaultSelection(candidates, MIN_ITEMS)) {
    if (items.length >= MIN_ITEMS) break;
    if (!seen.has(c.id)) {
      seen.add(c.id);
      items.push(toItem(c));
    }
  }

  const routine = model.routine
    .filter((r) => TIME_RE.test(r.time) && r.title.trim())
    .map((r) => ({
      time: r.time,
      title: clip(r.title, 70),
      detail: clip(r.detail, 240),
      actionId: byId.has(r.actionId) ? r.actionId : "",
    }))
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, MAX_ROUTINE);

  const fallback = buildRulePlan(ctx);
  return finalize(ctx, "ai", {
    headline: clip(model.headline, 160) || fallback.headline,
    summary: clip(model.summary, 600) || fallback.summary,
    careNote: clip(model.careNote, 500),
    routine: routine.length >= 3 ? routine : fallback.routine,
    items,
  });
}
