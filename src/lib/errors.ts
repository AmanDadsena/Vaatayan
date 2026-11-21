/** True for the error thrown when a fetch or stream is cancelled with an AbortController. */
export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException || error instanceof Error) &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}
