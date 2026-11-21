import { describe, expect, it } from "vitest";
import { buildContext, candidateActions } from "@/lib/impact";
import { buildRulePlan, defaultSelection, MAX_ITEMS, mergeModelPlan, MIN_ITEMS } from "@/lib/planner";
import type { ModelPlan } from "@/lib/schemas";
import { makeAir, makeHousehold } from "../fixtures";

const ctx = buildContext(makeHousehold(), makeAir());

const modelPlan = (overrides: Partial<ModelPlan> = {}): ModelPlan => ({
  headline: "Shift the morning walk to 3 pm and run the filter fan tonight.",
  summary: "Delhi's air is very unhealthy this morning but clears a little after lunch.",
  routine: [
    { time: "21:30", title: "Filter fan on", detail: "Bedroom door shut.", actionId: "diy-filter-fan" },
    { time: "06:30", title: "Windows shut", detail: "Morning peak.", actionId: "" },
    { time: "15:00", title: "Walk now", detail: "Cleanest hours.", actionId: "exercise-clean-window" },
  ],
  picks: [
    { actionId: "diy-filter-fan", why: "Cheapest big win for your bedroom.", steps: ["Buy filters", "Tape a cube", "Fan on top"] },
    { actionId: "switch-to-transit", why: "Your 12 km drive is your biggest emission.", steps: ["Try the metro twice", "Time it"] },
    { actionId: "exercise-clean-window", why: "Your morning walk hits the worst air.", steps: ["Walk at 3 pm", "Or do yoga"] },
    { actionId: "seal-gaps", why: "Leaky windows let smog in.", steps: ["Foam strips", "Door snake"] },
  ],
  careNote: "Keep your father's walks indoors this week.",
  ...overrides,
});

describe("buildRulePlan", () => {
  it("builds a complete plan without any model", () => {
    const plan = buildRulePlan(ctx);
    expect(plan.source).toBe("rules");
    expect(plan.items.length).toBeGreaterThanOrEqual(3);
    expect(plan.routine.length).toBeGreaterThanOrEqual(4);
    expect(plan.summary).toContain("211");
    expect(plan.cleanWindow).not.toBeNull();
  });

  it("orders the routine by time", () => {
    const times = buildRulePlan(ctx).routine.map((r) => r.time);
    expect(times).toEqual([...times].sort());
  });

  it("covers routine, indoor and swap actions", () => {
    const kinds = new Set(buildRulePlan(ctx).items.map((i) => i.kind));
    expect(kinds).toEqual(new Set(["routine", "indoor", "swap"]));
  });

  it("adds a care note for listed conditions", () => {
    const sick = buildContext(makeHousehold({ conditions: ["asthma-copd"] }), makeAir());
    expect(buildRulePlan(sick).careNote).toMatch(/inhaler/i);
  });

  it("does not double count commute alternatives in totals", () => {
    const plan = buildRulePlan(ctx);
    const commute = plan.items.filter((i) => i.group === "commute");
    const best = Math.max(0, ...commute.map((i) => i.impact.co2KgPerWeek));
    const others = plan.items.filter((i) => !i.group).reduce((s, i) => s + i.impact.co2KgPerWeek, 0);
    expect(plan.totals.co2KgPerWeek).toBeCloseTo(best + others, 1);
  });
});

describe("defaultSelection", () => {
  it("respects the maximum and keeps score order", () => {
    const candidates = candidateActions(ctx);
    const chosen = defaultSelection(candidates, 4);
    expect(chosen).toHaveLength(4);
    const order = chosen.map((c) => candidates.indexOf(c));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});

describe("mergeModelPlan", () => {
  it("uses the model's wording but the deterministic numbers", () => {
    const plan = mergeModelPlan(ctx, modelPlan());
    expect(plan.source).toBe("ai");
    expect(plan.headline).toMatch(/3 pm/);
    const transit = plan.items.find((i) => i.id === "switch-to-transit")!;
    expect(transit.why).toBe("Your 12 km drive is your biggest emission.");
    expect(transit.impact).toEqual(candidateActions(ctx).find((c) => c.id === "switch-to-transit")!.impact);
  });

  it("drops invented, inapplicable and duplicate action ids", () => {
    const plan = mergeModelPlan(
      ctx,
      modelPlan({
        picks: [
          { actionId: "buy-a-tesla", why: "x", steps: ["a", "b"] },
          { actionId: "hepa-bedroom", why: "no purifier here", steps: ["a", "b"] },
          { actionId: "seal-gaps", why: "first", steps: ["a", "b"] },
          { actionId: "seal-gaps", why: "dupe", steps: ["a", "b"] },
        ],
      }),
    );
    const ids = plan.items.map((i) => i.id);
    expect(ids).not.toContain("buy-a-tesla");
    expect(ids).not.toContain("hepa-bedroom");
    expect(ids.filter((id) => id === "seal-gaps")).toHaveLength(1);
    expect(plan.items.length).toBeGreaterThanOrEqual(MIN_ITEMS);
  });

  it("caps the number of actions", () => {
    const all = candidateActions(ctx).map((c) => ({ actionId: c.id, why: "w", steps: ["a", "b"] }));
    expect(mergeModelPlan(ctx, modelPlan({ picks: [...all, ...all] })).items.length).toBeLessThanOrEqual(MAX_ITEMS);
  });

  it("sorts the routine, drops malformed times and unknown links", () => {
    const plan = mergeModelPlan(
      ctx,
      modelPlan({
        routine: [
          { time: "25:00", title: "Bad", detail: "", actionId: "" },
          { time: "18:00", title: "Evening", detail: "d", actionId: "made-up" },
          { time: "07:00", title: "Morning", detail: "d", actionId: "" },
          { time: "13:00", title: "Lunch", detail: "d", actionId: "seal-gaps" },
        ],
      }),
    );
    expect(plan.routine.map((r) => r.time)).toEqual(["07:00", "13:00", "18:00"]);
    expect(plan.routine.find((r) => r.time === "18:00")!.actionId).toBe("");
  });

  it("falls back to the rules routine when the model's is too short", () => {
    const plan = mergeModelPlan(ctx, modelPlan({ routine: [{ time: "07:00", title: "Only one", detail: "", actionId: "" }] }));
    expect(plan.routine.length).toBeGreaterThanOrEqual(4);
  });

  it("clips overlong text from the model", () => {
    const plan = mergeModelPlan(ctx, modelPlan({ headline: "x".repeat(500) }));
    expect(plan.headline.length).toBeLessThanOrEqual(160);
  });
});
