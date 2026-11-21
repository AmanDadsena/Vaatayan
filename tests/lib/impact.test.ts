import { describe, expect, it } from "vitest";
import {
  ACTION_IDS,
  ACTIONS,
  buildContext,
  candidateActions,
  cigarettesAvoided,
  commuteHoursPerDay,
  getAction,
  score,
  totalImpact,
  UG_PER_CIGARETTE,
} from "@/lib/impact";
import type { Household } from "@/lib/schemas";
import { makeAir, makeHousehold } from "../fixtures";

const ctxFor = (overrides: Partial<Household> = {}) => buildContext(makeHousehold(overrides), makeAir());
const ids = (overrides: Partial<Household> = {}) => candidateActions(ctxFor(overrides)).map((c) => c.id);

describe("action catalogue", () => {
  it("has unique ids and complete copy", () => {
    expect(new Set(ACTION_IDS).size).toBe(ACTIONS.length);
    for (const a of ACTIONS) {
      expect(a.title.length).toBeGreaterThan(5);
      expect(a.why.length).toBeGreaterThan(10);
      expect(a.steps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("never produces negative or non-finite impact for any household", () => {
    const variants: Partial<Household>[] = [
      {},
      { commuteMode: "home" },
      { commuteMode: "walk-cycle", commuteKm: 0 },
      { hasPurifier: true, exercise: "none", children: 0 },
      { cookingFuel: "biomass", heating: "wood-coal" },
      { heating: "kerosene", commuteMode: "two-wheeler", commuteKm: 40 },
    ];
    for (const v of variants) {
      const ctx = ctxFor(v);
      for (const a of ACTIONS.filter((x) => x.applies(ctx))) {
        const i = a.impact(ctx);
        for (const n of [i.lungsUgPerDay, i.co2KgPerWeek, i.smogGPerWeek]) {
          expect(Number.isFinite(n)).toBe(true);
          expect(n).toBeGreaterThanOrEqual(0);
        }
        expect(i.basis.length).toBeGreaterThan(10);
      }
    }
  });
});

describe("applicability", () => {
  it("offers a purifier tip or a DIY filter, never both", () => {
    expect(ids({ hasPurifier: true })).toContain("hepa-bedroom");
    expect(ids({ hasPurifier: true })).not.toContain("diy-filter-fan");
    expect(ids({ hasPurifier: false })).toContain("diy-filter-fan");
  });

  it("only suggests transit and carpooling to people who drive", () => {
    expect(ids({ commuteMode: "car" })).toEqual(expect.arrayContaining(["switch-to-transit", "carpool"]));
    expect(ids({ commuteMode: "metro" })).not.toContain("switch-to-transit");
    expect(ids({ commuteMode: "home" })).not.toContain("carpool");
  });

  it("targets clean cooking and heating only where solid fuel is used", () => {
    expect(ids({ cookingFuel: "biomass" })).toContain("clean-cooking");
    expect(ids({ cookingFuel: "lpg" })).not.toContain("clean-cooking");
    expect(ids({ heating: "wood-coal" })).toContain("clean-heating");
    expect(ids({ heating: "electric" })).not.toContain("clean-heating");
  });

  it("skips child-specific advice for households without children", () => {
    expect(ids({ children: 0 })).not.toContain("kids-indoor-play");
  });

  it("recommends a mask only for exposed commutes", () => {
    expect(ids({ commuteMode: "two-wheeler" })).toContain("n95-outdoors");
    expect(ids({ commuteMode: "car" })).not.toContain("n95-outdoors");
  });
});

describe("numbers", () => {
  it("computes a car-to-metro swap from emission factors", () => {
    const i = getAction("switch-to-transit")!.impact(ctxFor({ commuteMode: "car", commuteKm: 10 }));
    // 100 km a week × (0.17 − 0.02) kg/km = 15 kg; × (0.025 − 0.001) g/km = 2.4 g
    expect(i.co2KgPerWeek).toBe(15);
    expect(i.smogGPerWeek).toBe(2.4);
  });

  it("scales a purifier's benefit with household size", () => {
    const one = getAction("hepa-bedroom")!.impact(ctxFor({ hasPurifier: true, adults: 1, children: 0, elders: 0 }));
    const four = getAction("hepa-bedroom")!.impact(ctxFor({ hasPurifier: true, adults: 2, children: 1, elders: 1 }));
    expect(four.lungsUgPerDay).toBe(one.lungsUgPerDay * 4);
  });

  it("works out commute time from speed", () => {
    expect(commuteHoursPerDay(makeHousehold({ commuteMode: "car", commuteKm: 25 }))).toBe(2);
    expect(commuteHoursPerDay(makeHousehold({ commuteMode: "home" }))).toBe(0);
  });

  it("ranks candidates by combined score, highest first", () => {
    const scores = candidateActions(ctxFor()).map((c) => score(c.impact));
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});

describe("totalImpact", () => {
  const imp = (co2: number) => ({ lungsUgPerDay: 0, co2KgPerWeek: co2, smogGPerWeek: 0, basis: "" });

  it("sums independent actions", () => {
    expect(totalImpact([{ impact: imp(2) }, { impact: imp(3) }]).co2KgPerWeek).toBe(5);
  });

  it("counts only the strongest alternative within a group", () => {
    const total = totalImpact([{ impact: imp(18), group: "commute" }, { impact: imp(13.6), group: "commute" }, { impact: imp(1) }]);
    expect(total.co2KgPerWeek).toBe(19);
  });

  it("is zero for no actions", () => {
    expect(totalImpact([])).toEqual({ lungsUgPerDay: 0, co2KgPerWeek: 0, smogGPerWeek: 0 });
  });
});

describe("cigarettesAvoided", () => {
  it("converts inhaled micrograms into cigarette equivalents", () => {
    expect(cigarettesAvoided(UG_PER_CIGARETTE)).toBe(1);
    expect(cigarettesAvoided(0)).toBe(0);
  });
});
