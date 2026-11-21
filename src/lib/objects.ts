/** Object.keys with the key type preserved, for records whose keys are a known union. */
export function keysOf<K extends string>(record: Readonly<Record<K, unknown>>): K[] {
  return Object.keys(record) as K[];
}

/** Narrows an untrusted string (e.g. a <select> value) to one of the allowed options, or returns the fallback. */
export function pickOption<T extends string>(options: readonly T[], value: string, fallback: T): T {
  return (options as readonly string[]).includes(value) ? (value as T) : fallback;
}
