"use client";

import { useEffect, useId, useRef, useState } from "react";
import { askQuestion, FriendlyError, type AnswerSource } from "@/lib/client";
import type { AirSnapshot, Household, Place } from "@/lib/schemas";
import styles from "./AskCoach.module.css";

interface Props {
  place: Place;
  air: AirSnapshot;
  household: Household;
  planSummary: string;
}

const SUGGESTIONS = [
  "Is it safe for the kids to play outside this evening?",
  "What size purifier do I need for a 12 m² bedroom?",
  "Does hanging a wet cloth on the window help?",
  "Should I still go for my morning walk?",
];

interface Turn {
  question: string;
  answer: string;
  source?: AnswerSource;
  failed?: boolean;
}

export function AskCoach({ place, air, household, planSummary }: Props) {
  const id = useId();
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function ask(text: string) {
    const q = text.trim();
    if (q.length < 3 || busy) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setBusy(true);
    setQuestion("");
    setTurns((t) => [...t, { question: q, answer: "" }]);
    const update = (patch: Partial<Turn>) =>
      setTurns((t) => t.map((turn, i) => (i === t.length - 1 ? { ...turn, ...patch } : turn)));

    try {
      const { source } = await askQuestion(
        { place, air, household, question: q, planSummary },
        (answer) => update({ answer }),
        controller.signal,
      );
      update({ source });
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        update({
          answer: error instanceof FriendlyError ? error.message : "Something went wrong. Try asking again.",
          failed: true,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.ask} aria-labelledby={`${id}-title`}>
      <div className={styles.head}>
        <h2 id={`${id}-title`}>Ask a follow-up</h2>
        <p className={styles.lede}>Answers use your live air data and household details.</p>
      </div>

      {turns.length > 0 && (
        <ol className={styles.thread} aria-live="polite" aria-busy={busy}>
          {turns.map((turn, i) => (
            <li key={i}>
              <p className={styles.q}>{turn.question}</p>
              <p className={styles.a} data-failed={turn.failed || undefined}>
                {turn.answer || <span className={styles.thinking}>Thinking about your air…</span>}
              </p>
              {turn.source && !turn.failed && (
                <p className={styles.source}>
                  {turn.source === "ai" ? "Answered by AI from your live data" : "Quick answer from built-in guidance and your live data"}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      <ul className={styles.suggestions} aria-label="Suggested questions">
        {SUGGESTIONS.map((s) => (
          <li key={s}>
            <button type="button" onClick={() => ask(s)} disabled={busy}>
              {s}
            </button>
          </li>
        ))}
      </ul>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
      >
        <label htmlFor={`${id}-q`} className="visually-hidden">
          Your question
        </label>
        <input
          id={`${id}-q`}
          type="text"
          maxLength={400}
          placeholder="Ask about your air, your plan or a swap"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button type="submit" disabled={busy || question.trim().length < 3}>
          {busy ? "Answering…" : "Ask"}
        </button>
      </form>
    </section>
  );
}
