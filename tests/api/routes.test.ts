// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isAiConfigured: vi.fn(),
  generateModelPlan: vi.fn(),
  streamAnswer: vi.fn(),
  fetchAir: vi.fn(),
  searchPlaces: vi.fn(),
}));

vi.mock("@/lib/ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai")>()),
  isAiConfigured: mocks.isAiConfigured,
  generateModelPlan: mocks.generateModelPlan,
  streamAnswer: mocks.streamAnswer,
}));

vi.mock("@/lib/airQuality", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/airQuality")>()),
  fetchAir: mocks.fetchAir,
  searchPlaces: mocks.searchPlaces,
}));

import { GET as airGET } from "@/app/api/air/route";
import { POST as askPOST } from "@/app/api/ask/route";
import { GET as placesGET } from "@/app/api/places/route";
import { POST as planPOST } from "@/app/api/plan/route";
import { AiUnavailableError } from "@/lib/ai";
import { UpstreamError } from "@/lib/airQuality";
import { makeAir, makeHousehold, PLACE } from "../fixtures";

let ip = 0;
/** A fresh client address per request so rate limits don't leak between tests. */
const headers = (extra: Record<string, string> = {}) => ({ "x-forwarded-for": `10.0.0.${++ip}`, ...extra });

const planRequest = (body: unknown, extra?: Record<string, string>) =>
  new Request("http://localhost/api/plan", {
    method: "POST",
    headers: headers({ "content-type": "application/json", ...extra }),
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const validBody = () => ({ place: PLACE, air: makeAir(), household: makeHousehold() });

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
});

describe("POST /api/plan", () => {
  it("returns a rules plan when no AI key is configured", async () => {
    mocks.isAiConfigured.mockReturnValue(false);
    const res = await planPOST(planRequest(validBody()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.plan.source).toBe("rules");
    expect(data.plan.items.length).toBeGreaterThan(0);
    expect(mocks.generateModelPlan).not.toHaveBeenCalled();
  });

  it("merges the model's plan when AI is available", async () => {
    mocks.isAiConfigured.mockReturnValue(true);
    mocks.generateModelPlan.mockResolvedValue({
      headline: "Walk at noon tomorrow.",
      summary: "Clean window at noon.",
      routine: [],
      picks: [{ actionId: "seal-gaps", why: "Your windows leak.", steps: ["Foam strips", "Door snake"] }],
      careNote: "",
    });
    const data = await (await planPOST(planRequest(validBody()))).json();
    expect(data.plan.source).toBe("ai");
    expect(data.plan.headline).toBe("Walk at noon tomorrow.");
    expect(data.plan.items[0].why).toBe("Your windows leak.");
  });

  it("falls back to rules with a notice when the AI fails", async () => {
    mocks.isAiConfigured.mockReturnValue(true);
    mocks.generateModelPlan.mockRejectedValue(new AiUnavailableError("The AI service is busy."));
    const data = await (await planPOST(planRequest(validBody()))).json();
    expect(data.plan.source).toBe("rules");
    expect(data.notice).toBe("The AI service is busy.");
  });

  it("rejects invalid JSON and invalid shapes with 400", async () => {
    expect((await planPOST(planRequest("{not json"))).status).toBe(400);
    const res = await planPOST(planRequest({ ...validBody(), household: { adults: 0 } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/household/);
  });

  it("rejects oversized bodies with 413", async () => {
    const res = await planPOST(planRequest({ ...validBody(), padding: "x".repeat(40_000) }));
    expect(res.status).toBe(413);
  });

  it("rate limits a single client", async () => {
    mocks.isAiConfigured.mockReturnValue(false);
    const fixed = { "x-forwarded-for": "203.0.113.9" };
    const statuses = [];
    for (let i = 0; i < 9; i++) {
      const req = new Request("http://localhost/api/plan", {
        method: "POST",
        headers: fixed,
        body: JSON.stringify(validBody()),
      });
      statuses.push((await planPOST(req)).status);
    }
    expect(statuses.slice(0, 8).every((s) => s === 200)).toBe(true);
    expect(statuses[8]).toBe(429);
  });
});

describe("POST /api/ask", () => {
  const askRequest = (body: unknown) =>
    new Request("http://localhost/api/ask", { method: "POST", headers: headers(), body: JSON.stringify(body) });

  it("answers from built-in guidance when no AI key is configured", async () => {
    mocks.isAiConfigured.mockReturnValue(false);
    const res = await askPOST(askRequest({ ...validBody(), question: "Is it safe for my kids to play outside?" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-answer-source")).toBe("rules");
    expect(res.headers.get("x-answer-topic")).toBe("children");
    expect(await res.text()).toMatch(/AQI 211/);
    expect(mocks.streamAnswer).not.toHaveBeenCalled();
  });

  it("streams plain text when configured", async () => {
    mocks.isAiConfigured.mockReturnValue(true);
    mocks.streamAnswer.mockReturnValue(new Response("Run indoors.").body);
    const res = await askPOST(askRequest({ ...validBody(), question: "Is it safe to run?" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/plain/);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-answer-source")).toBe("ai");
    expect(await res.text()).toBe("Run indoors.");
  });

  it("rejects an empty question", async () => {
    mocks.isAiConfigured.mockReturnValue(true);
    expect((await askPOST(askRequest({ ...validBody(), question: "" }))).status).toBe(400);
  });
});

describe("GET /api/air", () => {
  const airRequest = (qs: string) => new NextRequest(`http://localhost/api/air?${qs}`, { headers: headers() });

  it("returns the snapshot with a short public cache", async () => {
    mocks.fetchAir.mockResolvedValue(makeAir());
    const res = await airGET(airRequest("lat=28.61&lon=77.21"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toMatch(/max-age=120/);
    expect((await res.json()).aqi).toBe(211);
  });

  it.each(["lat=200&lon=0", "lat=abc&lon=1", "lon=1"])("rejects bad coordinates: %s", async (qs) => {
    expect((await airGET(airRequest(qs))).status).toBe(400);
    expect(mocks.fetchAir).not.toHaveBeenCalled();
  });

  it("returns 502 with the upstream message when the data source fails", async () => {
    mocks.fetchAir.mockRejectedValue(new UpstreamError("The air quality service did not respond in time."));
    const res = await airGET(airRequest("lat=1&lon=1"));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/did not respond/);
  });
});

describe("GET /api/places", () => {
  const placesRequest = (q: string) =>
    new NextRequest(`http://localhost/api/places?q=${encodeURIComponent(q)}`, { headers: headers() });

  it("returns matching places", async () => {
    mocks.searchPlaces.mockResolvedValue([PLACE]);
    const res = await placesGET(placesRequest("Delhi"));
    expect((await res.json()).places).toEqual([PLACE]);
  });

  it("accepts non-Latin scripts", async () => {
    mocks.searchPlaces.mockResolvedValue([]);
    expect((await placesGET(placesRequest("दिल्ली"))).status).toBe(200);
  });

  it.each(["a", "<script>", "x".repeat(81), "Delhi; DROP TABLE"])("rejects %s", async (q) => {
    expect((await placesGET(placesRequest(q))).status).toBe(400);
    expect(mocks.searchPlaces).not.toHaveBeenCalled();
  });
});

describe("rate limits and failures on the other routes", () => {
  const fixed = { "x-forwarded-for": "198.51.100.7" };

  it("limits rapid place searches and says when to retry", async () => {
    mocks.searchPlaces.mockResolvedValue([]);
    let last: Response | undefined;
    for (let i = 0; i < 91; i++) {
      last = await placesGET(new NextRequest("http://localhost/api/places?q=Delhi", { headers: fixed }));
    }
    expect(last!.status).toBe(429);
    expect(Number(last!.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("returns 502 when place search fails upstream", async () => {
    mocks.searchPlaces.mockRejectedValue(new UpstreamError("The place search sent data we could not read."));
    const res = await placesGET(new NextRequest("http://localhost/api/places?q=Delhi", { headers: headers() }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/could not read/);
  });

  it("limits rapid follow-up questions", async () => {
    mocks.isAiConfigured.mockReturnValue(false);
    const ask = () =>
      new Request("http://localhost/api/ask", {
        method: "POST",
        headers: { "x-forwarded-for": "198.51.100.8" },
        body: JSON.stringify({ ...validBody(), question: "Can we walk?" }),
      });
    const statuses: number[] = [];
    for (let i = 0; i < 13; i++) statuses.push((await askPOST(ask())).status);
    expect(statuses.at(-1)).toBe(429);
  });

  it("rejects oversized or broken follow-up bodies", async () => {
    const send = (body: string) =>
      askPOST(new Request("http://localhost/api/ask", { method: "POST", headers: headers(), body }));
    expect((await send("x".repeat(40_000))).status).toBe(413);
    expect((await send("{oops")).status).toBe(400);
  });
});
