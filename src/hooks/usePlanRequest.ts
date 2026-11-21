"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FriendlyError, getPlan } from "@/lib/client";
import { isAbortError } from "@/lib/errors";
import type { Plan } from "@/lib/planner";
import type { AirSnapshot, Household, Place } from "@/lib/schemas";

interface PlanResult {
  plan: Plan;
  /** Set when the AI was unavailable and the built-in rules wrote the plan. */
  notice?: string;
}

interface PlanRequestState {
  result: PlanResult | null;
  loading: boolean;
  error: string | null;
  request: (body: { place: Place; air: AirSnapshot; household: Household }) => Promise<void>;
  reset: () => void;
}

/** Requests a plan, cancelling any request still in flight, and exposes its state. */
export function usePlanRequest(): PlanRequestState {
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const request = useCallback<PlanRequestState["request"]>(async (body) => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    setError(null);
    try {
      setResult(await getPlan(body, current.signal));
    } catch (failure) {
      if (isAbortError(failure)) return;
      setError(failure instanceof FriendlyError ? failure.message : "Could not build your plan. Try again.");
    } finally {
      if (controller.current === current) setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    controller.current?.abort();
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return { result, loading, error, request, reset };
}
