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
