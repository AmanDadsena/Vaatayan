import type { BreathWindow } from "../breathWindow";
import {
  cigarettesAvoided,
  getAction,
  totalImpact,
  type ActionKind,
  type Candidate,
  type Impact,
  type ImpactContext,
} from "../impact";

/** Plan types, limits and the helpers shared by the rules planner and the AI merge. */

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

/** What /api/plan returns. */
export interface PlanResponse {
  plan: Plan;
  /** Set when the AI was asked but failed, so the built-in rules wrote the plan instead. */
  notice?: string;
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
export const MAX_ROUTINE = 7;

/** Shortens text to a maximum length, ending with an ellipsis when cut. */
export const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s).trim();
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
/** "2026-11-21T14:00" -> "14:00". */
export const hhmm = (time: string) => time.slice(11, 16);

/** A plan item from a candidate action, with the model's reason and steps when given, clipped to safe lengths. */
export function toItem(candidate: Candidate, why?: string, steps?: string[]): PlanItem {
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

/** Completes a plan from its parts: adds the totals, cigarettes avoided and today's clean and worst windows. */
export function finalize(
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
