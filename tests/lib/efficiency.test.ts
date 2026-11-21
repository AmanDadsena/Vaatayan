// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const genai = vi.hoisted(() => ({ generateContent: vi.fn(), generateContentStream: vi.fn() }));

vi.mock("@google/genai", () => ({
  ApiError: class extends Error {},
  FinishReason: {
    SAFETY: "SAFETY",
    RECITATION: "RECITATION",
    BLOCKLIST: "BLOCKLIST",
    PROHIBITED_CONTENT: "PROHIBITED_CONTENT",
    SPII: "SPII",
  },
  GoogleGenAI: class {
    models = { generateContent: genai.generateContent, generateContentStream: genai.generateContentStream };
  },
}));

import { cacheKey, clearAiCaches, generateModelPlan, getProvider, streamAnswer } from "@/lib/ai";
import { DEFAULT_HOUSEHOLD, readStoredHousehold, readStoredPlace } from "@/lib/domain";
import { buildContext } from "@/lib/impact";
import { householdSchema, locationSchema } from "@/lib/schemas";
import { createTtlCache } from "@/lib/ttlCache";
import { makeAir, makeHousehold, PLACE } from "../fixtures";

describe("createTtlCache", () => {
  it("returns values until they expire", () => {
    const cache = createTtlCache<number>({ ttlMs: 1000, maxEntries: 10 });
    cache.set("a", 1, 0);
    expect(cache.get("a", 999)).toBe(1);
    expect(cache.get("a", 1000)).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("evicts the least recently used entry when full", () => {
    const cache = createTtlCache<number>({ ttlMs: 60_000, maxEntries: 2 });
    cache.set("a", 1, 0);
    cache.set("b", 2, 0);
    cache.get("a", 1); // "a" is now the most recent
    cache.set("c", 3, 2);
    expect(cache.get("b", 3)).toBeUndefined();
    expect(cache.get("a", 3)).toBe(1);
    expect(cache.get("c", 3)).toBe(3);
  });

  it("overwrites and clears", () => {
    const cache = createTtlCache<string>({ ttlMs: 60_000, maxEntries: 5 });
    cache.set("k", "old", 0);
    cache.set("k", "new", 0);
    expect(cache.get("k", 1)).toBe("new");
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

describe("AI result caching", () => {
  const plan = { headline: "Walk at noon.", summary: "s", routine: [], picks: [], careNote: "" };
  const ctx = buildContext(makeHousehold(), makeAir());
  const ask = { place: PLACE, air: makeAir(), household: makeHousehold(), question: "Can we walk?", planSummary: "" };
  const read = (s: ReadableStream<Uint8Array>) => new Response(s).text();

  async function* chunks(parts: { text?: string; finishReason?: string }[]) {
    for (const p of parts) yield { text: p.text, candidates: [{ finishReason: p.finishReason }] };
  }

  beforeEach(() => {
    clearAiCaches();
    genai.generateContent.mockReset();
    genai.generateContentStream.mockReset();
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("GOOGLE_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("answers an identical plan request from cache without calling the model again", async () => {
    genai.generateContent.mockResolvedValue({ text: JSON.stringify(plan), candidates: [{ finishReason: "STOP" }] });
    await expect(generateModelPlan(PLACE, ctx)).resolves.toEqual(plan);
    await expect(generateModelPlan(PLACE, ctx)).resolves.toEqual(plan);
    expect(genai.generateContent).toHaveBeenCalledTimes(1);
  });

  it("asks again when anything in the prompt differs", async () => {
    genai.generateContent.mockResolvedValue({ text: JSON.stringify(plan), candidates: [{ finishReason: "STOP" }] });
    await generateModelPlan(PLACE, ctx);
    await generateModelPlan(PLACE, buildContext(makeHousehold({ children: 3 }), makeAir()));
    await generateModelPlan(PLACE, buildContext(makeHousehold(), makeAir({ aqi: 120 })));
    expect(genai.generateContent).toHaveBeenCalledTimes(3);
  });

  it("does not cache failures", async () => {
    genai.generateContent.mockResolvedValueOnce({ text: "{broken", candidates: [{ finishReason: "STOP" }] });
    await expect(generateModelPlan(PLACE, ctx)).rejects.toThrow();
    genai.generateContent.mockResolvedValueOnce({ text: JSON.stringify(plan), candidates: [{ finishReason: "STOP" }] });
    await expect(generateModelPlan(PLACE, ctx)).resolves.toEqual(plan);
  });

  it("replays a completed follow-up answer instantly", async () => {
    genai.generateContentStream.mockImplementation(async () => chunks([{ text: "Walk " }, { text: "at noon." }]));
    await expect(read(streamAnswer(ask, ctx))).resolves.toBe("Walk at noon.");
    await expect(read(streamAnswer(ask, ctx))).resolves.toBe("Walk at noon.");
    expect(genai.generateContentStream).toHaveBeenCalledTimes(1);
  });

  it("does not keep declined answers", async () => {
    genai.generateContentStream.mockImplementation(async () => chunks([{ finishReason: "SAFETY" }]));
    await read(streamAnswer(ask, ctx));
    await read(streamAnswer(ask, ctx));
    expect(genai.generateContentStream).toHaveBeenCalledTimes(2);
  });

  it("keys on provider, model and a hash rather than raw text", () => {
    const provider = getProvider()!;
    const key = cacheKey(provider, "system", "private household notes");
    expect(key).toMatch(/^gemini:gemini-2\.5-flash:[0-9a-f]{64}$/);
    expect(key).not.toContain("private");
    expect(cacheKey(provider, "system", "other")).not.toBe(key);
  });
});

describe("browser-side validators agree with the server schemas", () => {
  const households: unknown[] = [
    DEFAULT_HOUSEHOLD,
    { ...DEFAULT_HOUSEHOLD, notes: undefined },
    { ...DEFAULT_HOUSEHOLD, conditions: ["asthma-copd", "heart", "pregnancy"] },
    { ...DEFAULT_HOUSEHOLD, adults: 0 },
    { ...DEFAULT_HOUSEHOLD, adults: 12 },
    { ...DEFAULT_HOUSEHOLD, adults: 13 },
    { ...DEFAULT_HOUSEHOLD, children: 1.5 },
    { ...DEFAULT_HOUSEHOLD, elders: -1 },
    { ...DEFAULT_HOUSEHOLD, commuteKm: 150 },
    { ...DEFAULT_HOUSEHOLD, commuteKm: 151 },
    { ...DEFAULT_HOUSEHOLD, commuteKm: Number.NaN },
    { ...DEFAULT_HOUSEHOLD, commuteMode: "rocket" },
    { ...DEFAULT_HOUSEHOLD, conditions: ["flu"] },
    { ...DEFAULT_HOUSEHOLD, conditions: "asthma-copd" },
    { ...DEFAULT_HOUSEHOLD, hasPurifier: "yes" },
    { ...DEFAULT_HOUSEHOLD, heating: "sun" },
    { ...DEFAULT_HOUSEHOLD, cookingFuel: undefined },
    { ...DEFAULT_HOUSEHOLD, exercise: "night" },
    { ...DEFAULT_HOUSEHOLD, notes: "x".repeat(280) },
    { ...DEFAULT_HOUSEHOLD, notes: "x".repeat(281) },
    null,
    [],
    "household",
    {},
  ];

  it.each(households.map((h, i) => [i, h]))("household sample %i", (_, sample) => {
    expect(readStoredHousehold(sample) !== null).toBe(householdSchema.safeParse(sample).success);
  });

  const places: unknown[] = [
    PLACE,
    { ...PLACE, latitude: 90.1 },
    { ...PLACE, longitude: -180 },
    { ...PLACE, longitude: -181 },
    { ...PLACE, name: "x".repeat(121) },
    { ...PLACE, latitude: "28" },
    { latitude: 1, longitude: 1 },
    null,
  ];

  it.each(places.map((p, i) => [i, p]))("place sample %i", (_, sample) => {
    expect(readStoredPlace(sample) !== null).toBe(locationSchema.safeParse(sample).success);
  });

  it("returns clean copies rather than the stored object", () => {
    const stored = { ...DEFAULT_HOUSEHOLD, conditions: ["heart"], extra: "ignored" };
    const read = readStoredHousehold(stored)!;
    expect(read).not.toHaveProperty("extra");
    expect(read.conditions).not.toBe(stored.conditions);
  });
});
