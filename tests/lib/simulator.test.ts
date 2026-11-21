import { describe, expect, it } from "vitest";
import {
  addDeltas,
  CAR_CO2_KG_PER_YEAR,
  commuteDose,
  compareCommute,
  compareFuel,
  concentrationForMixingHeight,
  COOKING,
  HEATING,
  minutesToClean,
  requiredCadr,
  scaleUp,
} from "@/lib/simulator";

describe("compareCommute", () => {
  it("shows a car-to-metro switch as better on every count", () => {
    const d = compareCommute({ from: "car", to: "metro", km: 10, days: 5, pm25: 90 });
    expect(d.co2KgPerWeek).toBe(15);
    expect(d.smogGPerWeek).toBe(2.4);
    expect(d.lungsUgPerDay).toBeGreaterThan(0);
  });

  it("is honest that cycling in smog means breathing more", () => {
    const d = compareCommute({ from: "car", to: "walk-cycle", km: 10, days: 5, pm25: 90 });
    expect(d.co2KgPerWeek).toBeGreaterThan(0);
    expect(d.lungsUgPerDay).toBeLessThan(0);
  });

  it("is zero when nothing changes", () => {
    expect(compareCommute({ from: "bus", to: "bus", km: 8, days: 5, pm25: 60 })).toEqual({
      lungsUgPerDay: 0,
      co2KgPerWeek: 0,
      smogGPerWeek: 0,
    });
  });

  it("treats working from home as no trip", () => {
    expect(commuteDose("home", 20, 200)).toBe(0);
    expect(compareCommute({ from: "car", to: "home", km: 10, days: 5, pm25: 90 }).co2KgPerWeek).toBe(17);
  });
});

describe("compareFuel", () => {
  it("shows the trade-off of switching kerosene for an electric heater", () => {
    const d = compareFuel(HEATING.kerosene, HEATING.electric, 4);
    expect(d.lungsUgPerDay).toBeGreaterThan(0);
    expect(d.smogGPerWeek).toBeGreaterThan(0);
    expect(d.co2KgPerWeek).toBeLessThan(0);
  });

  it("makes moving off solid-fuel cooking a large lungs win", () => {
    expect(compareFuel(COOKING.biomass, COOKING.lpg, 4).lungsUgPerDay).toBeGreaterThan(2000);
  });
});

describe("addDeltas and scaleUp", () => {
  it("adds deltas", () => {
    const a = { lungsUgPerDay: 10, co2KgPerWeek: 1.5, smogGPerWeek: 2 };
    expect(addDeltas(a, a)).toEqual({ lungsUgPerDay: 20, co2KgPerWeek: 3, smogGPerWeek: 4 });
  });

  it("scales a weekly saving to a year across households", () => {
    const s = scaleUp({ lungsUgPerDay: 0, co2KgPerWeek: 10, smogGPerWeek: 5 }, 1000);
    expect(s.co2TonnesPerYear).toBe(520);
    expect(s.smogKgPerYear).toBe(260);
    expect(s.carsEquivalent).toBe(Math.round(520_000 / CAR_CO2_KG_PER_YEAR));
  });
});

describe("purifier sizing", () => {
  it("asks for five air changes an hour", () => {
    expect(requiredCadr(4, 3.5, 2.8)).toEqual({ volumeM3: 39.2, cadrM3h: 196, cadrCfm: 115 });
  });

  it("guards against nonsense dimensions", () => {
    expect(requiredCadr(-1, 3, 3).cadrM3h).toBe(0);
  });

  it("uses first-order decay for cleaning time", () => {
    // 5 air changes an hour removes 80% in −ln(0.2)/5 h ≈ 19.3 min
    expect(minutesToClean(200, 40)).toBe(19);
    expect(minutesToClean(0, 40)).toBeNull();
    expect(minutesToClean(200, 40, 1)).toBeNull();
  });
});

describe("concentrationForMixingHeight", () => {
  it("is inversely proportional to layer depth and clamped", () => {
    expect(concentrationForMixingHeight(40, 1000)).toBe(40);
    expect(concentrationForMixingHeight(40, 200)).toBe(200);
    expect(concentrationForMixingHeight(40, 10)).toBe(800);
    expect(concentrationForMixingHeight(40, 10_000)).toBe(13);
  });
});
