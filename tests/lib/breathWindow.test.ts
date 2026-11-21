import { describe, expect, it } from "vitest";
import { findCleanestWindow, findWorstWindow, formatHour, type HourlyReading } from "@/lib/breathWindow";
import { makeAir } from "../fixtures";

const series = (aqis: number[], startHour = 0): HourlyReading[] =>
  aqis.map((aqi, i) => ({ time: `2026-11-21T${String(startHour + i).padStart(2, "0")}:00`, aqi, pm25: aqi / 2 }));

describe("findCleanestWindow", () => {
  it("finds the lowest two-hour stretch in waking hours", () => {
    const w = findCleanestWindow(makeAir().hourly);
    expect(w).not.toBeNull();
    // The fixture is cleanest around noon the next day (PM2.5 60 and 58).
    expect(w!.start).toBe("2026-11-22T12:00");
    expect(w!.end).toBe("2026-11-22T14:00");
  });

  it("ignores windows outside waking hours", () => {
    const aqis: number[] = Array.from({ length: 24 }, (_, h) => (h < 5 ? 10 : 200));
    aqis[12] = 150;
    aqis[13] = 150;
    expect(findCleanestWindow(series(aqis))!.start).toBe("2026-11-21T12:00");
  });

  it("prefers the earliest window on a tie", () => {
    expect(findCleanestWindow(series(Array(24).fill(100)))!.start).toBe("2026-11-21T06:00");
  });

  it("skips windows that span a gap in the data", () => {
    const readings = series([100, 100, 100], 8);
    readings.splice(1, 1);
    expect(findCleanestWindow(readings)).toBeNull();
  });

  it("returns null when there is too little data", () => {
    expect(findCleanestWindow([])).toBeNull();
    expect(findCleanestWindow(series([50], 9))).toBeNull();
    expect(findCleanestWindow(series([50, 50], 9), { hours: 0 })).toBeNull();
  });

  it("averages AQI and PM2.5 across the window", () => {
    expect(findCleanestWindow(series([90, 110], 10))).toMatchObject({ averageAqi: 100, averagePm25: 50 });
  });

  it("handles windows that cross midnight into the next day", () => {
    const w = findCleanestWindow(makeAir().hourly, { wakeHour: 0, sleepHour: 24 });
    expect(w).not.toBeNull();
  });
});

describe("findWorstWindow", () => {
  it("finds the dirtiest waking window", () => {
    expect(findWorstWindow(makeAir().hourly)!.start).toBe("2026-11-22T06:00");
  });
});

describe("formatHour", () => {
  it.each([
    ["2026-11-21T00:00", "12 am"],
    ["2026-11-21T09:00", "9 am"],
    ["2026-11-21T12:00", "12 pm"],
    ["2026-11-21T15:00", "3 pm"],
  ])("formats %s as %s", (time, label) => {
    expect(formatHour(time)).toBe(label);
  });
});
