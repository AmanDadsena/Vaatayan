// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAir, roundCoord, searchPlaces, UpstreamError } from "@/lib/airQuality";
import { must } from "../fixtures";

/** A minimal, valid Open-Meteo air-quality payload. */
const airPayload = (pm = 70.5) => ({
  timezone: "Asia/Kolkata",
  current: { time: "2026-11-21T15:30", us_aqi: 211, pm2_5: pm, pm10: 75, nitrogen_dioxide: 40, ozone: 160 },
  hourly: {
    time: ["2026-11-21T15:00", "2026-11-21T16:00", "2026-11-21T17:00"],
    us_aqi: [211, 212, 213],
    pm2_5: [pm, 82, 118],
  },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;
let coord = 10;
/** Each test uses fresh coordinates so the last-good cache never leaks between tests. */
const nextCoord = () => (coord += 1);

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("roundCoord", () => {
  it("rounds to about a kilometre", () => {
    expect(roundCoord(28.61394)).toBe(28.61);
    expect(roundCoord(-74.9159)).toBe(-74.92);
  });
});

describe("fetchAir", () => {
  it("requests rounded coordinates with the fields the app needs", async () => {
    fetchMock.mockResolvedValue(json(airPayload()));
    const snap = await fetchAir(28.61394, 77.20901);
    expect(snap.aqi).toBe(211);
    const url = new URL(must(fetchMock.mock.calls[0], "fetch call")[0]);
    expect(url.searchParams.get("latitude")).toBe("28.61");
    expect(url.searchParams.get("longitude")).toBe("77.21");
    expect(url.searchParams.get("current")).toContain("pm2_5");
    expect(url.searchParams.get("timezone")).toBe("auto");
  });

  it("retries once after a 5xx and succeeds", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: true }, 503)).mockResolvedValueOnce(json(airPayload()));
    await expect(fetchAir(nextCoord(), 1)).resolves.toMatchObject({ aqi: 211 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once after a network timeout and succeeds", async () => {
    fetchMock
      .mockRejectedValueOnce(new DOMException("timed out", "TimeoutError"))
      .mockResolvedValueOnce(json(airPayload()));
    await expect(fetchAir(nextCoord(), 1)).resolves.toMatchObject({ aqi: 211 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 4xx, which will not fix itself", async () => {
    fetchMock.mockResolvedValue(json({ reason: "bad request" }, 400));
    await expect(fetchAir(nextCoord(), 1)).rejects.toThrow("returned 400");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after a second 5xx with a friendly error", async () => {
    fetchMock.mockResolvedValue(json({}, 502));
    const error = await fetchAir(nextCoord(), 1).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as Error).message).toBe("The air quality service returned 502.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports unreadable upstream data clearly", async () => {
    fetchMock.mockResolvedValue(json({ unexpected: "shape" }));
    await expect(fetchAir(nextCoord(), 1)).rejects.toThrow("could not read");
  });

  it("serves the last good reading for a place when the service later fails", async () => {
    const lat = nextCoord();
    fetchMock.mockResolvedValueOnce(json(airPayload(64)));
    const first = await fetchAir(lat, 5);

    fetchMock.mockReset();
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(fetchAir(lat, 5)).resolves.toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not serve another place's reading from the cache", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(fetchAir(nextCoord(), 99)).rejects.toThrow("did not respond in time");
  });
});

describe("searchPlaces", () => {
  it("joins name, region and country into one readable label", async () => {
    fetchMock.mockResolvedValue(
      json({ results: [{ name: "Delhi", admin1: "Delhi", country: "India", latitude: 28.65, longitude: 77.23 }] }),
    );
    await expect(searchPlaces("Delhi")).resolves.toEqual([
      { name: "Delhi, Delhi, India", latitude: 28.65, longitude: 77.23 },
    ]);
    expect(new URL(must(fetchMock.mock.calls[0], "fetch call")[0]).searchParams.get("name")).toBe("Delhi");
  });

  it("returns an empty list when nothing matches", async () => {
    fetchMock.mockResolvedValue(json({}));
    await expect(searchPlaces("Nowhereville")).resolves.toEqual([]);
  });

  it("rejects malformed results", async () => {
    fetchMock.mockResolvedValue(json({ results: [{ name: 1 }] }));
    await expect(searchPlaces("Pune")).rejects.toThrow("place search");
  });
});
