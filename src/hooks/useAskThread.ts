"use client";

import { useEffect, useRef, useState } from "react";
import { askQuestion, FriendlyError, type AnswerSource } from "@/lib/client";
import { isAbortError } from "@/lib/errors";
import type { AirSnapshot, Household, Place } from "@/lib/schemas";

/** Questions shorter than this are ignored; the API rejects them too. */
export const MIN_QUESTION = 3;

/** One question and its answer, which fills in as it streams. */
export interface Turn {
  question: string;
  answer: string;
  source?: AnswerSource;
  failed?: boolean;
}

/** The live data every question is answered against. */
export interface AskContext {
  place: Place;
  air: AirSnapshot;
  household: Household;
  planSummary: string;
}

/**
 * A question-and-answer thread. Answers stream into the newest turn; asking
 * again or leaving the page cancels the answer in flight.
 */
export function useAskThread(context: AskContext) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const updateLatest = (patch: Partial<Turn>) =>
    setTurns((t) => t.map((turn, i) => (i === t.length - 1 ? { ...turn, ...patch } : turn)));

  async function ask(text: string) {
    const question = text.trim();
    if (question.length < MIN_QUESTION || busy) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setBusy(true);
    setTurns((t) => [...t, { question, answer: "" }]);
    try {
      const { source } = await askQuestion(
        { ...context, question },
        (answer) => updateLatest({ answer }),
        controller.signal,
      );
      updateLatest({ source });
    } catch (error) {
      if (isAbortError(error)) return;
      const answer = error instanceof FriendlyError ? error.message : "Something went wrong. Try asking again.";
      updateLatest({ answer, failed: true });
    } finally {
      setBusy(false);
    }
  }

  return { turns, busy, ask };
}
