"use client";

import { useId, useState } from "react";
import { MIN_QUESTION, useAskThread, type AskContext, type Turn } from "@/hooks/useAskThread";
import styles from "./AskCoach.module.css";

const SUGGESTIONS = [
  "Is it safe for the kids to play outside this evening?",
  "What size purifier do I need for a 12 m² bedroom?",
  "Does hanging a wet cloth on the window help?",
  "Should I still go for my morning walk?",
];

/** The questions asked so far, each with its streamed answer and where the answer came from. */
function Thread({ turns, busy }: { turns: Turn[]; busy: boolean }) {
  return (
    <ol className={styles.thread} aria-live="polite" aria-busy={busy}>
      {turns.map((turn, i) => (
        <li key={i}>
          <p className={styles.q}>{turn.question}</p>
          <p className={styles.a} data-failed={turn.failed || undefined}>
            {turn.answer || <span className={styles.thinking}>Thinking about your air…</span>}
          </p>
          {turn.source && !turn.failed && (
            <p className={styles.source}>
              {turn.source === "ai"
                ? "Answered by AI from your live data"
                : "Quick answer from built-in guidance and your live data"}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Follow-up questions about the plan, answered from the same live air and household data. */
export function AskCoach(context: AskContext) {
  const id = useId();
  const [question, setQuestion] = useState("");
  const { turns, busy, ask } = useAskThread(context);

  const submit = (text: string) => {
    setQuestion("");
    void ask(text);
  };

  return (
    <section className="panel" aria-labelledby={`${id}-title`}>
      <div className={styles.head}>
        <h2 id={`${id}-title`}>Ask a follow-up</h2>
        <p className={styles.lede}>Answers use your live air data and household details.</p>
      </div>

      {turns.length > 0 && <Thread turns={turns} busy={busy} />}

      <ul className={styles.suggestions} aria-label="Suggested questions">
        {SUGGESTIONS.map((s) => (
          <li key={s}>
            <button type="button" onClick={() => submit(s)} disabled={busy}>
              {s}
            </button>
          </li>
        ))}
      </ul>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          submit(question);
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
        <button type="submit" disabled={busy || question.trim().length < MIN_QUESTION}>
          {busy ? "Answering…" : "Ask"}
        </button>
      </form>
    </section>
  );
}
