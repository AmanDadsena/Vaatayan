import { NextResponse } from "next/server";
import type { ZodError, ZodType } from "zod";
import { clientKey, type RateLimiter } from "./rateLimit";

/** The outcome of checking a request: the validated input, or the error response to send instead. */
type Checked<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/** A JSON error body that is never cached. */
export function jsonError(status: number, message: string, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/** Turns the first Zod issue into one readable sentence, prefixed with the field it is about. */
function validationMessage(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "The request was not valid.";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

/** Reads a JSON body with a hard size cap so oversized payloads are rejected early. */
async function readJson(request: Request, maxBytes = 32_000): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new RangeError("too-large");
  const text = await request.text();
  if (text.length > maxBytes) throw new RangeError("too-large");
  return JSON.parse(text);
}

/** A 429 response with Retry-After when this caller is over the limit, otherwise null. */
function rateLimited(limiter: RateLimiter, request: Request, message: string): NextResponse | null {
  const rate = limiter.check(clientKey(request.headers));
  return rate.ok ? null : jsonError(429, message, { "Retry-After": String(rate.retryAfterSeconds) });
}

function validate<T>(schema: ZodType<T>, input: unknown): Checked<T> {
  const parsed = schema.safeParse(input);
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, response: jsonError(400, validationMessage(parsed.error)) };
}

interface QueryOptions<T> {
  limiter: RateLimiter;
  schema: ZodType<T>;
  /** The search params to read; a missing one reaches the schema as "". */
  keys: readonly string[];
  /** Shown when the caller is rate limited. */
  busy: string;
}

/** Rate limits a GET request, then validates the named search params. */
export function checkQuery<T>(request: Request, { limiter, schema, keys, busy }: QueryOptions<T>): Checked<T> {
  const limited = rateLimited(limiter, request, busy);
  if (limited) return { ok: false, response: limited };
  const params = new URL(request.url).searchParams;
  return validate(schema, Object.fromEntries(keys.map((key) => [key, params.get(key) ?? ""])));
}

interface JsonPostOptions<T> {
  limiter: RateLimiter;
  schema: ZodType<T>;
  /** Shown when the caller is rate limited. */
  busy: string;
  /** Shown when the body is not JSON or is too large. */
  badBody: string;
}

/** Runs every check a state-changing JSON endpoint needs: origin and type guard, rate limit, size cap, schema. */
export async function checkJsonPost<T>(request: Request, options: JsonPostOptions<T>): Promise<Checked<T>> {
  const refused = guardJsonPost(request) ?? rateLimited(options.limiter, request, options.busy);
  if (refused) return { ok: false, response: refused };
  try {
    return validate(options.schema, await readJson(request));
  } catch (error) {
    return { ok: false, response: jsonError(error instanceof RangeError ? 413 : 400, options.badBody) };
  }
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
  if (request.headers.get("sec-fetch-site") === "cross-site" || !sameOrigin(request)) {
    return jsonError(403, "Requests from other websites are not allowed.");
  }
  const type = request.headers.get("content-type") ?? "";
  if (!/^application\/json\b/i.test(type)) return jsonError(415, "Send the request as application/json.");
  return null;
}

/** True when there is no Origin header or it names this host; "null" and malformed origins fail. */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
