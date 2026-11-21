"use client";

import { useEffect, useState } from "react";
import styles from "./PlanLoading.module.css";

/** What the server actually does, in order. Timings are typical, not promised. */
export const STAGES = [
  { label: "Reading today's forecast", after: 0 },
  { label: "Finding your clean-air window", after: 1500 },
  { label: "Choosing actions that fit your home", after: 3500 },
  { label: "Writing your plan", after: 6500 },
] as const;

/** Shown while the plan is being written: a window with air flowing through, and honest progress. */
export function PlanLoading() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = STAGES.slice(1).map((s, i) => window.setTimeout(() => setStage(i + 1), s.after));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <svg className={styles.art} viewBox="0 0 120 140" aria-hidden="true">
        <path
          className={styles.frame}
          d="M24 132V62c0-22 15-34 28-43 5-3.5 7-7.5 8-13 1 5.5 3 9.5 8 13 13 9 28 21 28 43v70z"
        />
        <path className={styles.wind} d="M4 80h60c10 0 14-11 6-16" />
        <path className={`${styles.wind} ${styles.windLate}`} d="M14 100h70c10 0 14 11 6 16" />
        <circle className={styles.sun} cx="74" cy="52" r="7" />
      </svg>

      <div className={styles.text}>
        <p className={styles.title}>Writing a plan for your household</p>
        <ol className={styles.stages}>
          {STAGES.map((s, i) => (
            <li key={s.label} data-state={i < stage ? "done" : i === stage ? "active" : "todo"}>
              <span className={styles.dot} aria-hidden="true" />
              {s.label}
              {i < stage && <span className="visually-hidden"> (done)</span>}
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.skeleton} aria-hidden="true">
        <span style={{ width: "88%" }} />
        <span style={{ width: "64%" }} />
        <span className={styles.block} />
        <span style={{ width: "72%" }} />
        <span style={{ width: "54%" }} />
      </div>
    </div>
  );
}
