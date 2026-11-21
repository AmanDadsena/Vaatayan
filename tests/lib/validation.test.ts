import { describe, expect, it } from "vitest";
import { toSnapshot } from "@/lib/airQuality";
import { clientKey, createRateLimiter } from "@/lib/rateLimit";
import { askRequestSchema, householdSchema, planRequestSchema } from "@/lib/schemas";
import { makeAir, makeHousehold, PLACE } from "../fixtures";

describe("householdSchema", () => {
  it("accepts the defaults", () => {
    expect(householdSchema.safeParse(makeHousehold()).success).toBe(true);
  });

  it.each([
    ["zero adults", { adults: 0 }],
    ["fractional people", { children: 1.5 }],
    ["an unknown commute", { commuteMode: "teleport" }],
    ["an absurd distance", { commuteKm: 10_000 }],
    ["overlong notes", { notes: "a".repeat(281) }],
  ])("rejects %s", (_, patch) => {
    expect(householdSchema.safeParse({ ...makeHousehold(), ...patch }).success).toBe(false);
  });

  it("strips control characters and collapses whitespace in notes", () => {
    const parsed = householdSchema.parse({ ...makeHousehold(), notes: "  school\u0000 bus\n\n at 7  " });
    expect(parsed.notes).toBe("school bus at 7");
  });
});

describe("request schemas", () => {
  it("accepts a well-formed plan request", () => {
    expect(planRequestSchema.safeParse({ place: PLACE, air: makeAir(), household: makeHousehold() }).success).toBe(true);
  });

  it("rejects out-of-range coordinates and malformed times", () => {
    expect(planRequestSchema.safeParse({ place: { ...PLACE, latitude: 120 }, air: makeAir(), household: makeHousehold() }).success).toBe(false);
    expect(planRequestSchema.safeParse({ place: PLACE, air: makeAir({ time: "yesterday" }), household: makeHousehold() }).success).toBe(false);
  });

  it("requires a real question", () => {
    const base = { place: PLACE, air: makeAir(), household: makeHousehold() };
    expect(askRequestSchema.safeParse({ ...base, question: "  " }).success).toBe(false);
    expect(askRequestSchema.safeParse({ ...base, question: "x".repeat(401) }).success).toBe(false);
    expect(askRequestSchema.safeParse({ ...base, question: "Can my son play outside?" }).success).toBe(true);
  });
});

describe("toSnapshot", () => {
  const raw = {
    timezone: "Asia/Kolkata",
    current: { time: "2026-11-21T15:30", us_aqi: 211, pm2_5: 70.54, pm10: 75.2, nitrogen_dioxide: 41.5, ozone: 162 },
    hourly: {
      time: ["2026-11-21T14:00", "2026-11-21T15:00", "2026-11-21T16:00", "2026-11-21T17:00"],
      us_aqi: [200, 211, 211, 212],
      pm2_5: [60, 70.5, null, 118.3],
    },
  };

  it("starts at the current hour, skips gaps and derives hourly AQI from PM2.5", () => {
    const snap = toSnapshot(raw);
    expect(snap.aqi).toBe(211);
    expect(snap.pm25).toBe(70.5);
    expect(snap.hourly.map((h) => h.time)).toEqual(["2026-11-21T15:00", "2026-11-21T17:00"]);
    expect(snap.hourly[1].aqi).toBeGreaterThan(snap.hourly[0].aqi);
  });

  it("rejects malformed upstream data", () => {
    expect(() => toSnapshot({ nope: true })).toThrow();
  });
});

describe("rate limiter", () => {
  it("allows up to the limit, then blocks until the window resets", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.check("a", 0).ok).toBe(true);
    expect(limiter.check("a", 10).ok).toBe(true);
    const blocked = limiter.check("a", 20);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
    expect(limiter.check("b", 20).ok).toBe(true);
    expect(limiter.check("a", 1001).ok).toBe(true);
  });

  it("reads the first forwarded address", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
    expect(clientKey(new Headers())).toBe("anonymous");
  });
});
