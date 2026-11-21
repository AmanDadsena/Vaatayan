import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function jsonError(status: number, message: string, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function validationMessage(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "The request was not valid.";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

/** Reads a JSON body with a hard size cap so oversized payloads are rejected early. */
export async function readJson(request: Request, maxBytes = 32_000): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new RangeError("too-large");
  const text = await request.text();
  if (text.length > maxBytes) throw new RangeError("too-large");
  return JSON.parse(text);
}

/**
 * Guards for state-changing API calls. Returns an error response to send, or
 * null when the request may proceed.
 *
 * - Cross-site requests are refused, so another website cannot make a
 *   visitor's browser spend this app's AI quota. Browsers send Sec-Fetch-Site
 *   and Origin on every POST; non-browser clients send neither and are still
 *   bound by rate limits and validation.
 * - A JSON content type is required, which plain HTML forms cannot send.
 */
export function guardJsonPost(request: Request): NextResponse | null {
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site") return jsonError(403, "Requests from other websites are not allowed.");

  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      /* "null" or malformed origin */
    }
    if (originHost !== host) return jsonError(403, "Requests from other websites are not allowed.");
  }

  const type = request.headers.get("content-type") ?? "";
  if (!/^application\/json\b/i.test(type)) return jsonError(415, "Send the request as application/json.");
  return null;
}
