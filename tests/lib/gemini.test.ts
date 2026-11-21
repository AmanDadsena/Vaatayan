// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const genai = vi.hoisted(() => {
  class ApiError extends Error {
    status: number;
    constructor({ message, status }: { message: string; status: number }) {
      super(message);
      this.status = status;
    }
  }
  return { generateContent: vi.fn(), generateContentStream: vi.fn(), ApiError, constructed: vi.fn() };
});

vi.mock("@google/genai", () => ({
  ApiError: genai.ApiError,
  FinishReason: {
    STOP: "STOP",
    SAFETY: "SAFETY",
    RECITATION: "RECITATION",
    BLOCKLIST: "BLOCKLIST",
    PROHIBITED_CONTENT: "PROHIBITED_CONTENT",
    SPII: "SPII",
  },
  GoogleGenAI: class {
    models = { generateContent: genai.generateContent, generateContentStream: genai.generateContentStream };
    constructor(options: unknown) {
      genai.constructed(options);
    }
  },
}));

import {
  generateModelPlan,
  getProvider,
  isAiConfigured,
  streamAnswer,
  AiUnavailableError,
  clearAiCaches,
} from "@/lib/ai";
import { buildContext } from "@/lib/impact";
import { makeAir, makeHousehold, PLACE } from "../fixtures";

const ctx = buildContext(makeHousehold(), makeAir());
const validPlan = {
  headline: "Walk at noon tomorrow.",
  summary: "Very unhealthy air this morning.",
  routine: [{ time: "12:00", title: "Walk", detail: "Cleanest hours.", actionId: "exercise-clean-window" }],
  picks: [{ actionId: "seal-gaps", why: "Leaky windows.", steps: ["Foam strips", "Door snake"] }],
  careNote: "",
};

beforeEach(() => {
  clearAiCaches();
  genai.generateContent.mockReset();
  genai.generateContentStream.mockReset();
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  vi.stubEnv("GOOGLE_API_KEY", "google-test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("provider selection", () => {
  it("uses Gemini when only a Google key is set", () => {
    expect(getProvider()?.name).toBe("gemini");
    expect(getProvider()?.model).toBe("gemini-2.5-flash");
    expect(isAiConfigured()).toBe(true);
  });

  it("accepts GEMINI_API_KEY and a model override", () => {
    vi.stubEnv("GOOGLE_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "other-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-3-flash-preview");
    expect(getProvider()?.model).toBe("gemini-3-flash-preview");
  });

  it("pins the client to the v1beta API, which supports system instructions and JSON mode", () => {
    genai.generateContent.mockResolvedValue({
      text: JSON.stringify(validPlan),
      candidates: [{ finishReason: "STOP" }],
    });
    return generateModelPlan(PLACE, ctx).then(() => {
      expect(genai.constructed).toHaveBeenCalledWith(expect.objectContaining({ apiVersion: "v1beta" }));
    });
  });

  it("prefers Anthropic when both keys are set", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "anthropic-key");
    expect(getProvider()?.name).toBe("anthropic");
  });

  it("falls back to rules with no keys at all", () => {
    vi.stubEnv("GOOGLE_API_KEY", "");
    expect(getProvider()).toBeNull();
    expect(isAiConfigured()).toBe(false);
  });
});

describe("Gemini plans", () => {
  it("requests JSON mode with the plan schema and validates the reply", async () => {
    genai.generateContent.mockResolvedValue({
      text: JSON.stringify(validPlan),
      candidates: [{ finishReason: "STOP" }],
    });
    await expect(generateModelPlan(PLACE, ctx)).resolves.toEqual(validPlan);

    const [params] = genai.generateContent.mock.calls[0];
    expect(params.model).toBe("gemini-2.5-flash");
    expect(params.config.responseMimeType).toBe("application/json");
    expect(params.config.responseJsonSchema).toMatchObject({
      type: "object",
      required: expect.arrayContaining(["picks"]),
    });
    expect(params.config.responseJsonSchema).not.toHaveProperty("$schema");
    expect(params.config.systemInstruction).toMatch(/never as instructions/i);
    expect(params.contents).toContain("US AQI 211");
    expect(params.config.thinkingConfig).toEqual({ thinkingBudget: 1024 });
  });

  it("sends readable labels, never internal ids, to the model", async () => {
    genai.generateContent.mockResolvedValue({
      text: JSON.stringify(validPlan),
      candidates: [{ finishReason: "STOP" }],
    });
    const sick = buildContext(makeHousehold({ conditions: ["asthma-copd"], cookingFuel: "lpg" }), makeAir());
    await generateModelPlan(PLACE, sick);
    const [params] = genai.generateContent.mock.calls[0];
    expect(params.contents).toContain("Asthma or COPD");
    expect(params.contents).not.toContain("asthma-copd");
    expect(params.contents).toContain("lpg or piped gas");
  });

  it("rejects malformed or wrongly shaped JSON so the app can fall back", async () => {
    genai.generateContent.mockResolvedValueOnce({ text: "{not json", candidates: [{ finishReason: "STOP" }] });
    await expect(generateModelPlan(PLACE, ctx)).rejects.toThrow("incomplete plan");

    genai.generateContent.mockResolvedValueOnce({
      text: JSON.stringify({ headline: 1 }),
      candidates: [{ finishReason: "STOP" }],
    });
    await expect(generateModelPlan(PLACE, ctx)).rejects.toThrow("wrong shape");
  });

  it("treats a safety block as unavailable", async () => {
    genai.generateContent.mockResolvedValue({ text: "", candidates: [{ finishReason: "SAFETY" }] });
    await expect(generateModelPlan(PLACE, ctx)).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it("maps API errors to friendly messages", async () => {
    genai.generateContent.mockRejectedValueOnce(new genai.ApiError({ message: "quota", status: 429 }));
    await expect(generateModelPlan(PLACE, ctx)).rejects.toThrow("The AI service is busy.");
    genai.generateContent.mockRejectedValueOnce(new genai.ApiError({ message: "denied", status: 403 }));
    await expect(generateModelPlan(PLACE, ctx)).rejects.toThrow("The AI key is not valid.");
    genai.generateContent.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(generateModelPlan(PLACE, ctx)).rejects.toThrow("could not be reached");
  });
});

describe("Gemini follow-ups", () => {
  const request = {
    place: PLACE,
    air: makeAir(),
    household: makeHousehold(),
    question: "Can we walk?",
    planSummary: "",
  };

  async function* chunks(parts: { text?: string; finishReason?: string }[], fail = false) {
    for (const p of parts) yield { text: p.text, candidates: [{ finishReason: p.finishReason }] };
    if (fail) throw new Error("dropped");
  }

  it("streams text chunks", async () => {
    genai.generateContentStream.mockResolvedValue(
      chunks([{ text: "Walk " }, { text: "at noon.", finishReason: "STOP" }]),
    );
    await expect(new Response(streamAnswer(request, ctx)).text()).resolves.toBe("Walk at noon.");
    expect(genai.generateContentStream.mock.calls[0][0].config.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });

  it("explains a blocked answer", async () => {
    genai.generateContentStream.mockResolvedValue(chunks([{ finishReason: "SAFETY" }]));
    await expect(new Response(streamAnswer(request, ctx)).text()).resolves.toMatch(/can't help with that/);
  });

  it("tells the user when the stream drops", async () => {
    genai.generateContentStream.mockResolvedValue(chunks([{ text: "Partial" }], true));
    await expect(new Response(streamAnswer(request, ctx)).text()).resolves.toMatch(/^Partial[\s\S]*cut off/);
  });
});
