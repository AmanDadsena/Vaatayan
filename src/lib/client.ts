import type { Plan } from "./planner";
import type { AirSnapshot, Household, Place } from "./schemas";

/** Error with a message that is safe and useful to show to people. */
export class FriendlyError extends Error {}

async function readError(res: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data.error === "string") message = data.error;
  } catch {
    /* body was not JSON; keep the fallback */
  }
  throw new FriendlyError(message);
}

async function request<T>(input: string, init: RequestInit, fallback: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new FriendlyError("You seem to be offline. Check your connection and try again.");
  }
  if (!res.ok) return readError(res, fallback);
  return (await res.json()) as T;
}

export function searchPlaces(query: string, signal?: AbortSignal) {
  return request<{ places: Place[] }>(
    `/api/places?q=${encodeURIComponent(query)}`,
    { signal },
    "Place search is unavailable right now.",
  ).then((d) => d.places);
}

export function getAir(place: Place, signal?: AbortSignal) {
  const qs = new URLSearchParams({ lat: String(place.latitude), lon: String(place.longitude) });
  return request<AirSnapshot>(`/api/air?${qs}`, { signal }, "Could not load air quality for this place.");
}

export function getPlan(body: { place: Place; air: AirSnapshot; household: Household }, signal?: AbortSignal) {
  return request<{ plan: Plan; notice?: string }>(
    "/api/plan",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal },
    "Could not build your plan. Try again.",
  );
}

/** Streams a follow-up answer, calling onText with the full text so far. */
export async function askQuestion(
  body: { place: Place; air: AirSnapshot; household: Household; question: string; planSummary: string },
  onText: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new FriendlyError("You seem to be offline. Check your connection and try again.");
  }
  if (!res.ok || !res.body) return readError(res, "Could not answer that right now.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onText(text);
  }
  return text;
}

/* ---------- Local persistence (never leaves the device) ---------- */

export function loadLocal<T>(key: string, validate: (v: unknown) => T | null): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? validate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveLocal(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or disabled: the app still works without it */
  }
}
