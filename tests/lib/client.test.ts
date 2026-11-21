import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askQuestion, FriendlyError, getAir, getPlan, loadLocal, saveLocal, searchPlaces } from "@/lib/client";
import { siteUrl } from "@/lib/site";
import { makeAir, makeHousehold, PLACE, must } from "../fixtures";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const body = { place: PLACE, air: makeAir(), household: makeHousehold() };

describe("API client", () => {
  it("encodes search terms and returns places", async () => {
    fetchMock.mockResolvedValue(json({ places: [PLACE] }));
    await expect(searchPlaces("São Paulo")).resolves.toEqual([PLACE]);
    expect(must(fetchMock.mock.calls[0], "fetch call")[0]).toBe("/api/places?q=S%C3%A3o%20Paulo");
  });

  it("asks for air by coordinates", async () => {
    fetchMock.mockResolvedValue(json(makeAir()));
    await getAir(PLACE);
    expect(must(fetchMock.mock.calls[0], "fetch call")[0]).toBe("/api/air?lat=28.61&lon=77.21");
  });

  it("posts the plan request as JSON", async () => {
    fetchMock.mockResolvedValue(json({ plan: { source: "rules" } }));
    await getPlan(body);
    const [url, init] = must(fetchMock.mock.calls[0], "fetch call");
    expect(url).toBe("/api/plan");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body).place).toEqual(PLACE);
  });

  it("surfaces the server's error message", async () => {
    fetchMock.mockResolvedValue(json({ error: "Too many requests. Try again shortly." }, 429));
    await expect(getAir(PLACE)).rejects.toThrow("Too many requests. Try again shortly.");
  });

  it("falls back to a friendly message when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>502</html>", { status: 502 }));
    const error = await getPlan(body).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FriendlyError);
    expect((error as Error).message).toBe("Could not build your plan. Try again.");
  });

  it("explains being offline", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(searchPlaces("Delhi")).rejects.toThrow("You seem to be offline");
  });

  it("lets aborts through untouched so callers can ignore them", async () => {
    fetchMock.mockRejectedValue(new DOMException("aborted", "AbortError"));
    await expect(getAir(PLACE)).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("askQuestion", () => {
  const ask = { ...body, question: "Can we walk?", planSummary: "" };

  it("streams text and reports which engine answered", async () => {
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode("Walk "));
        c.enqueue(new TextEncoder().encode("at noon."));
        c.close();
      },
    });
    fetchMock.mockResolvedValue(new Response(stream, { headers: { "X-Answer-Source": "rules" } }));
    const seen: string[] = [];
    const result = await askQuestion(ask, (t) => seen.push(t));
    expect(result).toEqual({ text: "Walk at noon.", source: "rules" });
    expect(seen.at(-1)).toBe("Walk at noon.");
  });

  it("treats an unlabelled answer as AI-written", async () => {
    fetchMock.mockResolvedValue(new Response("Hello"));
    await expect(askQuestion(ask, () => {})).resolves.toMatchObject({ source: "ai" });
  });

  it("surfaces errors and offline state", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "Ask a slightly longer question." }, 400));
    await expect(askQuestion(ask, () => {})).rejects.toThrow("Ask a slightly longer question.");
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(askQuestion(ask, () => {})).rejects.toThrow("offline");
    fetchMock.mockRejectedValueOnce(new DOMException("aborted", "AbortError"));
    await expect(askQuestion(ask, () => {})).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("local storage helpers", () => {
  it("round-trips valid data", () => {
    saveLocal("k", { a: 1 });
    expect(loadLocal("k", (v) => v as { a: number })).toEqual({ a: 1 });
  });

  it("returns null for missing, corrupt or rejected data", () => {
    expect(loadLocal("missing", (v) => v)).toBeNull();
    window.localStorage.setItem("bad", "{not json");
    expect(loadLocal("bad", (v) => v)).toBeNull();
    saveLocal("k2", { a: 1 });
    expect(loadLocal("k2", () => null)).toBeNull();
  });

  it("keeps working when storage is unavailable", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    expect(() => saveLocal("k", 1)).not.toThrow();
    setItem.mockRestore();
  });
});

describe("siteUrl", () => {
  it("prefers the configured public address", () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://vaatayan.example" }).origin).toBe("https://vaatayan.example");
  });

  it("uses Vercel's production domain when deployed there", () => {
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "vaatayan.vercel.app" }).origin).toBe(
      "https://vaatayan.vercel.app",
    );
  });

  it("ignores invalid or non-web values and falls back to localhost", () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "not a url" }).origin).toBe("http://localhost:3000");
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "javascript:alert(1)" }).origin).toBe("http://localhost:3000");
    expect(siteUrl({}).origin).toBe("http://localhost:3000");
  });
});
