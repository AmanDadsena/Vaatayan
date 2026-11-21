import { describe, expect, it } from "vitest";
import { isAbortError } from "@/lib/errors";
import { LAB_DEFAULTS, seedLabSettings } from "@/lib/labSettings";
import { keysOf, pickOption } from "@/lib/objects";
import { makeHousehold } from "../fixtures";

describe("isAbortError", () => {
  it("recognises cancelled and timed-out requests", () => {
    expect(isAbortError(new DOMException("aborted", "AbortError"))).toBe(true);
    expect(isAbortError(new DOMException("slow", "TimeoutError"))).toBe(true);
    const error = new Error("cancelled");
    error.name = "AbortError";
    expect(isAbortError(error)).toBe(true);
  });

  it("ignores everything else", () => {
    expect(isAbortError(new TypeError("Failed to fetch"))).toBe(false);
    expect(isAbortError({ name: "AbortError" })).toBe(false);
    expect(isAbortError("AbortError")).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});

describe("object helpers", () => {
  it("keysOf keeps the key type and order", () => {
    expect(keysOf({ lpg: 1, electric: 2, biomass: 3 })).toEqual(["lpg", "electric", "biomass"]);
  });

  it("pickOption accepts known options and falls back otherwise", () => {
    const fuels = ["lpg", "electric", "biomass"] as const;
    expect(pickOption(fuels, "biomass", "lpg")).toBe("biomass");
    expect(pickOption(fuels, "rocket fuel", "lpg")).toBe("lpg");
    expect(pickOption(fuels, "", "electric")).toBe("electric");
  });
});

describe("seedLabSettings", () => {
  it("uses a useful default comparison when nothing is saved", () => {
    expect(seedLabSettings(null)).toBe(LAB_DEFAULTS);
  });

  it("starts from the saved commute and suggests the sensible switch", () => {
    const s = seedLabSettings(makeHousehold({ commuteMode: "two-wheeler", commuteKm: 7 }));
    expect(s).toMatchObject({ from: "two-wheeler", to: "metro", km: 7 });
    expect(seedLabSettings(makeHousehold({ commuteMode: "metro" })).to).toBe("walk-cycle");
  });

  it("keeps the default commute for people who work from home", () => {
    const s = seedLabSettings(makeHousehold({ commuteMode: "home", commuteKm: 0 }));
    expect(s).toMatchObject({ from: LAB_DEFAULTS.from, to: LAB_DEFAULTS.to, km: LAB_DEFAULTS.km });
  });

  it("suggests cleaner heating and cooking and counts the household", () => {
    const s = seedLabSettings(
      makeHousehold({ heating: "wood-coal", cookingFuel: "biomass", adults: 3, children: 2, elders: 1 }),
    );
    expect(s).toMatchObject({
      heatFrom: "wood-coal",
      heatTo: "electric",
      cookFrom: "biomass",
      cookTo: "lpg",
      people: 6,
    });
    expect(seedLabSettings(makeHousehold({ heating: "electric" })).heatTo).toBe("none");
  });

  it("never commutes zero kilometres in the lab", () => {
    expect(seedLabSettings(makeHousehold({ commuteMode: "car", commuteKm: 0 })).km).toBe(1);
  });
});
