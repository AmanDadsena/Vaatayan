"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/** Same-tab writes notify subscribers through this event; other tabs use the native "storage" event. */
const LOCAL_EVENT = "vaatayan:storage";

/**
 * The latest value written in this tab, per key. Reads prefer it, so the app keeps
 * working even when the browser refuses to persist (private mode, full quota).
 */
const memory = new Map<string, string>();

function subscribe(onChange: () => void): () => void {
  const fromOtherTab = (event: StorageEvent) => {
    if (event.key) memory.delete(event.key); // another tab's write is newer than ours
    onChange();
  };
  window.addEventListener("storage", fromOtherTab);
  window.addEventListener(LOCAL_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", fromOtherTab);
    window.removeEventListener(LOCAL_EVENT, onChange);
  };
}

function readRaw(key: string): string | null {
  const remembered = memory.get(key);
  if (remembered !== undefined) return remembered;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // storage disabled: behave as if nothing was saved
  }
}

function writeRaw(key: string, raw: string): void {
  memory.set(key, raw);
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    // Not persisted (private mode or full quota); the in-memory copy still serves this session.
  }
  window.dispatchEvent(new Event(LOCAL_EVENT));
}

/**
 * State persisted in localStorage, read through useSyncExternalStore so the
 * server render and the first client render agree (no hydration mismatch) and
 * no effect has to copy storage into state. Saved values are validated on read;
 * anything invalid falls back to `initial`.
 *
 * `validate` and `initial` should be stable (module-level), as they feed memoisation.
 */
export function useStoredState<T>(
  key: string,
  validate: (value: unknown) => T | null,
  initial: T,
): [T, (next: T | ((previous: T) => T)) => void] {
  // The snapshot is the raw string: a stable primitive, so React re-renders only on real changes.
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );

  const value = useMemo(() => {
    if (raw === null) return initial;
    try {
      return validate(JSON.parse(raw)) ?? initial;
    } catch {
      return initial;
    }
  }, [raw, validate, initial]);

  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      const resolved = next instanceof Function ? next(value) : next;
      writeRaw(key, JSON.stringify(resolved));
    },
    [key, value],
  );

  return [value, setValue];
}

/** Test helper: forget in-memory values so each test starts from storage alone. */
export function resetStoredStateMemory(): void {
  memory.clear();
}
