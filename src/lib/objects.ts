/** Object.keys with the key type preserved, for records whose keys are a known union. */
export function keysOf<K extends string>(record: Readonly<Record<K, unknown>>): K[] {
  // Object.keys is typed string[] by design; for a Record<K, …> every own key is a K.
  return Object.keys(record) as K[];
}

/** True when an untrusted value is one of the allowed options, narrowing its type. */
export function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return options.some((option) => option === value);
}

/** Narrows an untrusted string (e.g. a <select> value) to one of the allowed options, or returns the fallback. */
export function pickOption<T extends string>(options: readonly T[], value: string, fallback: T): T {
  return isOneOf(options, value) ? value : fallback;
}

/** Removes the earliest-inserted entry. Maps keep insertion order, so this is the oldest (or least recent). */
export function dropOldest<K, V>(map: Map<K, V>): void {
  const first = map.keys().next();
  if (!first.done) map.delete(first.value);
}
