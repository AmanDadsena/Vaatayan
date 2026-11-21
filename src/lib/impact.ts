import { INDOOR_ACTIONS } from "./actions/indoor";
import { ROUTINE_ACTIONS } from "./actions/routine";
import { SWAP_ACTIONS } from "./actions/swaps";
import { findCleanestWindow, findWorstWindow } from "./breathWindow";
import { round, type ActionDefinition, type ActionKind, type Impact, type ImpactContext } from "./exposure";
import type { AirSnapshot, Household } from "./schemas";

/**
 * Deterministic impact model. The language model chooses and explains actions;
 * every number the user sees is computed here so it is reproducible and testable.
 *
 * - ./exposure: physical constants, emission factors and helpers
 * - ./actions/*: the catalogue of actions, grouped by kind
 * - this file: assembling the catalogue, ranking candidates and adding up totals
 */

export * from "./exposure";

export const ACTIONS: readonly ActionDefinition[] = [...ROUTINE_ACTIONS, ...INDOOR_ACTIONS, ...SWAP_ACTIONS];

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
