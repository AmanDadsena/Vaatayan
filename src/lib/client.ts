import { isAbortError } from "./errors";
import type { PlanResponse } from "./planner";
import type { AirSnapshot, AskRequest, Place, PlanRequest } from "./schemas";

/** Error with a message that is safe and useful to show to people. */
export class FriendlyError extends Error {}

/** Where a follow-up answer came from: the AI model, or the built-in guidance. */
export type AnswerSource = "ai" | "rules";

const OFFLINE = "You seem to be offline. Check your connection and try again.";

/** Throws the API's own error message when it sent one, otherwise the fallback. */
async function readError(res: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const data: unknown = await res.json();
    if (typeof data === "object" && data !== null && "error" in data && typeof data.error === "string") {
      message = data.error;
    }
  } catch {
    /* body was not JSON; keep the fallback */
  }
  throw new FriendlyError(message);
}

/** fetch, with network failures turned into a friendly offline message. Cancellation is passed through. */
async function send(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new FriendlyError(OFFLINE);
  }
}

const jsonPost = (body: unknown, signal?: AbortSignal): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
  signal,
});

/**
 * Calls one of this app's own JSON endpoints. The server validates its output
 * with the same schemas, so the shape is trusted here.
 */
async function request<T>(input: string, init: RequestInit, fallback: string): Promise<T> {
  const res = await send(input, init);
  if (!res.ok) return readError(res, fallback);
  return (await res.json()) as T;
}

/** Calls /api/places; resolves to the matching places. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const url = `/api/places?${new URLSearchParams({ q: query })}`;
  const data = await request<{ places: Place[] }>(url, { signal }, "Place search is unavailable right now.");
  return data.places;
}

/** Calls /api/air for a place's current and hourly air. */
export function getAir(place: Place, signal?: AbortSignal): Promise<AirSnapshot> {
  const qs = new URLSearchParams({ lat: String(place.latitude), lon: String(place.longitude) });
  return request<AirSnapshot>(`/api/air?${qs}`, { signal }, "Could not load air quality for this place.");
}

/** Calls /api/plan; resolves to the plan and, if the AI failed, a notice. */
export function getPlan(body: PlanRequest, signal?: AbortSignal): Promise<PlanResponse> {
  return request<PlanResponse>("/api/plan", jsonPost(body, signal), "Could not build your plan. Try again.");
}

/** Streams a follow-up answer, calling onText with the full text so far. */
export async function askQuestion(
  body: AskRequest,
  onText: (text: string) => void,
  signal?: AbortSignal,
): Promise<{ text: string; source: AnswerSource }> {
  const res = await send("/api/ask", jsonPost(body, signal));
  if (!res.ok || !res.body) return readError(res, "Could not answer that right now.");
  const source: AnswerSource = res.headers.get("X-Answer-Source") === "rules" ? "rules" : "ai";

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onText(text);
  }
  // Flush bytes held back for a character split across the final chunk boundary (µ, ³, ₂, Devanagari).
  const tail = decoder.decode();
  if (tail) {
    text += tail;
    onText(text);
  }
  return { text, source };
}
