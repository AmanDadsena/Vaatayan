"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { FriendlyError, searchPlaces } from "@/lib/client";
import { isAbortError } from "@/lib/errors";
import type { Place } from "@/lib/schemas";

const DEBOUNCE_MS = 300;

/** Queries shorter than this are not sent; place names need at least two letters. */
export const MIN_QUERY = 2;

interface PlaceResults {
  results: Place[];
  /** A sentence for the live region: how many matched, or what went wrong. */
  status: string;
  setStatus: (status: string) => void;
  /** Empties the results and the status, e.g. after a choice or when the query gets too short. */
  clear: () => void;
}

/**
 * Debounced place search. Each new query cancels the request in flight, so a
 * slow answer for an old query can never replace a newer one.
 */
export function usePlaceResults(query: string, onResults: () => void): PlaceResults {
  const [results, setResults] = useState<Place[]>([]);
  const [status, setStatus] = useState("");
  // Reads the latest callback without making it a reason to search again.
  const announce = useEffectEvent(onResults);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const places = await searchPlaces(q, controller.signal);
        setResults(places);
        announce();
        setStatus(
          places.length ? `${places.length} places found. Use the arrow keys to choose.` : "No places match that name.",
        );
      } catch (error) {
        if (isAbortError(error)) return;
        setResults([]);
        setStatus(error instanceof FriendlyError ? error.message : "Search failed. Try again.");
      }
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const clear = () => {
    setResults([]);
    setStatus("");
  };

  return { results, status, setStatus, clear };
}
