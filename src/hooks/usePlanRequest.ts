"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FriendlyError, getPlan } from "@/lib/client";
import { isAbortError } from "@/lib/errors";
import type { PlanResponse } from "@/lib/planner";
import type { PlanRequest } from "@/lib/schemas";

interface PlanRequestState {
  result: PlanResponse | null;
  loading: boolean;
  error: string | null;
  request: (body: PlanRequest) => Promise<void>;
  reset: () => void;
}

/** Requests a plan, cancelling any request still in flight, and exposes its state. */
export function usePlanRequest(): PlanRequestState {
  const [result, setResult] = useState<PlanResponse | null>(null);
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
