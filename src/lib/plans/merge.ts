import { candidateActions, type ImpactContext } from "../impact";
import type { ModelPlan } from "../schemas";
import {
  MAX_ITEMS,
  MIN_ITEMS,
  MAX_ROUTINE,
  clip,
  TIME_RE,
  toItem,
  defaultSelection,
  finalize,
  type PlanItem,
  type Plan,
} from "./core";
import { buildRulePlan } from "./rules";

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
