"use client";

import { useMemo, useState } from "react";
import type { HourlyReading } from "@/lib/breathWindow";
import { cigarettesAvoided, METHOD_NOTES, totalImpact } from "@/lib/impact";
import type { Plan } from "@/lib/planner";
import { ActionGroups } from "./plan/ActionGroups";
import { DayTimeline } from "./plan/DayTimeline";
import { ImpactLedger } from "./plan/ImpactLedger";
import styles from "./PlanView.module.css";

interface Props {
  plan: Plan;
  notice?: string;
  /** Hourly forecast, so each routine step can show the air at that hour. */
  hourly?: HourlyReading[];
}

/**
 * A finished plan. Owns the one piece of shared state, which actions the
 * household commits to, so the ledger totals follow the ticks.
 */
export function PlanView({ plan, notice, hourly = [] }: Props) {
  const [committed, setCommitted] = useState<ReadonlySet<string>>(() => new Set(plan.items.map((i) => i.id)));

  const totals = useMemo(() => totalImpact(plan.items.filter((i) => committed.has(i.id))), [plan.items, committed]);

  const toggle = (id: string) =>
    setCommitted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <article className={styles.plan} aria-labelledby="plan-headline">
      <header className={styles.header}>
        <p className={styles.source} data-source={plan.source}>
          {plan.source === "ai" ? "Written by AI from today's live forecast" : "Quick plan from built-in rules"}
        </p>
        <h2 id="plan-headline" className={styles.headline} tabIndex={-1}>
          {plan.headline}
        </h2>
        <p className={styles.summary}>{plan.summary}</p>
        {notice && (
          <p className={styles.notice} role="note">
            AI was unavailable ({notice}), so this plan uses built-in rules. The numbers are the same.
          </p>
        )}
      </header>

      <ImpactLedger count={committed.size} totals={totals} cigarettes={cigarettesAvoided(totals.lungsUgPerDay)} />

      {plan.careNote && (
        <aside className={styles.care} aria-label="Care note">
          <h3>For the people most at risk</h3>
          <p>{plan.careNote}</p>
        </aside>
      )}

      <DayTimeline routine={plan.routine} cleanWindow={plan.cleanWindow} hourly={hourly} />

      <ActionGroups items={plan.items} committed={committed} onToggle={toggle} />

      <details className={styles.method}>
        <summary>About these numbers</summary>
        <ul>
          {METHOD_NOTES.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </details>
    </article>
  );
}
