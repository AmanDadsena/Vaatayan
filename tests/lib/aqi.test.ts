import { describe, expect, it } from "vitest";
import { aqiFromPm25, categorize, cigarettesPerDay, hazeDensity } from "@/lib/aqi";

describe("categorize", () => {
  it.each([
    [0, "good"],
    [50, "good"],
    [51, "moderate"],
    [100, "moderate"],
    [150, "sensitive"],
    [200, "unhealthy"],
    [201, "very-unhealthy"],
    [300, "very-unhealthy"],
    [301, "hazardous"],
    [999, "hazardous"],
  ])("puts AQI %i in %s", (aqi, level) => {
    expect(categorize(aqi).level).toBe(level);
  });

  it("treats invalid input as clean rather than throwing", () => {
    expect(categorize(Number.NaN).level).toBe("good");
    expect(categorize(-20).level).toBe("good");
  });
});

describe("aqiFromPm25 (EPA 2024 breakpoints)", () => {
  it.each([
    [0, 0],
    [9.0, 50],
    [9.1, 51],
    [35.4, 100],
    [55.4, 150],
    [125.4, 200],
    [225.4, 300],
    [325.4, 500],
  ])("maps %f µg/m³ to AQI %i at breakpoints", (pm, aqi) => {
    expect(aqiFromPm25(pm)).toBe(aqi);
  });

  it("interpolates inside a band", () => {
    // (200 − 151) / (125.4 − 55.5) × (70.5 − 55.5) + 151 = 161.5
    expect(aqiFromPm25(70.5)).toBe(162);
  });

  it("caps above the scale and handles bad input", () => {
    expect(aqiFromPm25(900)).toBe(500);
    expect(aqiFromPm25(-1)).toBe(0);
    expect(aqiFromPm25(Number.NaN)).toBe(0);
  });

  it("never decreases as PM2.5 rises", () => {
    let last = -1;
    for (let pm = 0; pm <= 330; pm += 0.7) {
      const aqi = aqiFromPm25(pm);
      expect(aqi).toBeGreaterThanOrEqual(last);
      last = aqi;
    }
  });
});

describe("hazeDensity", () => {
  it("is 0 for clean air, 1 at the top of the scale, and clamps", () => {
    expect(hazeDensity(0)).toBe(0);
    expect(hazeDensity(500)).toBe(1);
    expect(hazeDensity(900)).toBe(1);
    expect(hazeDensity(-5)).toBe(0);
  });

  it("still separates very unhealthy from unhealthy for sensitive groups", () => {
    expect(hazeDensity(300)).toBeGreaterThan(hazeDensity(150));
  });
});

describe("cigarettesPerDay", () => {
  it("uses the 22 µg/m³ per cigarette rule of thumb", () => {
    expect(cigarettesPerDay(22)).toBe(1);
    expect(cigarettesPerDay(66)).toBe(3);
    expect(cigarettesPerDay(0)).toBe(0);
  });
});
