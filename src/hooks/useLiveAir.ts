"use client";

import { useCallback, useEffect, useState } from "react";
import { FriendlyError, getAir } from "@/lib/client";
import { isAbortError } from "@/lib/errors";
import type { AirSnapshot, Place } from "@/lib/schemas";

interface Result {
  /** Which request this result answers; loading is derived by comparing keys. */
  key: string;
  air: AirSnapshot | null;
  error: string | null;
}

interface LiveAir {
  air: AirSnapshot | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Live air for a place. Refetches when the place changes or on retry, cancels
 * stale requests, and keeps the last reading visible while a new one loads.
 */
export function useLiveAir(place: Place): LiveAir {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${place.latitude},${place.longitude}#${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    getAir(place, controller.signal)
      .then((air) => setResult({ key, air, error: null }))
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        const message = error instanceof FriendlyError ? error.message : "Could not load air quality.";
        setResult({ key, air: null, error: message });
      });
    return () => controller.abort();
    // `key` changes with the coordinates and on every retry; `place` is stable between changes.
  }, [place, key]);

  const loading = result?.key !== key;
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    // The previous reading stays on screen while a new one loads.
    air: result?.air ?? null,
    loading,
    error: loading ? null : (result?.error ?? null),
    retry,
  };
}
