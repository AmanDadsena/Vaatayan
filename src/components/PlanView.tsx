"use client";

import { useMemo, useState } from "react";
import { formatHour } from "@/lib/breathWindow";
import { cigarettesAvoided, METHOD_NOTES, totalImpact, type ActionKind } from "@/lib/impact";
import type { Plan, PlanItem } from "@/lib/planner";
import styles from "./PlanView.module.css";

interface Props {
  plan: Plan;
  notice?: string;
}

const KIND_HEADINGS: Record<ActionKind, { title: string; lede: string }> = {
  routine: { title: "Your day", lede: "Small timing changes that cut what you breathe." },
  indoor: { title: "Indoor air", lede: "Make home the cleanest air you breathe all day." },
  swap: { title: "Lower-emission swaps", lede: "Choices that leave less smog for everyone." },
};

const fmt = (n: number, digits = 0) =>
  n.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: 0 });

function ImpactChips({ item }: { item: PlanItem }) {
  const { lungsUgPerDay, co2KgPerWeek, smogGPerWeek } = item.impact;
  const chips: { key: string; text: string }[] = [];
  if (lungsUgPerDay > 0) chips.push({ key: "lungs", text: `${fmt(lungsUgPerDay)} µg less PM2.5 breathed a day` });
  if (co2KgPerWeek > 0) chips.push({ key: "co2", text: `${fmt(co2KgPerWeek, 1)} kg CO₂ saved a week` });
  if (smogGPerWeek > 0) chips.push({ key: "smog", text: `${fmt(smogGPerWeek, 1)} g less smog a week` });
  if (chips.length === 0) return null;
  return (
    <ul className={styles.chips} aria-label="Estimated impact">
      {chips.map((c) => (
        <li key={c.key} data-kind={c.key}>
          {c.text}
        </li>
      ))}
    </ul>
  );
}

export function PlanView({ plan, notice }: Props) {
  const [committed, setCommitted] = useState<Set<string>>(() => new Set(plan.items.map((i) => i.id)));

  const totals = useMemo(
    () => totalImpact(plan.items.filter((i) => committed.has(i.id))),
    [plan.items, committed],
  );
  const cigarettes = cigarettesAvoided(totals.lungsUgPerDay);

  const toggle = (id: string) =>
    setCommitted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const groups = (["routine", "indoor", "swap"] as const)
    .map((kind) => ({ kind, items: plan.items.filter((i) => i.kind === kind) }))
    .filter((g) => g.items.length > 0);

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

      <section className={styles.ledger} aria-labelledby="ledger-title">
        <h3 id="ledger-title">If you do the {committed.size} things you&apos;ve ticked</h3>
        <dl className={styles.ledgerGrid} aria-live="polite">
          <div data-tone="lungs">
            <dt>Kept out of your family&apos;s lungs</dt>
            <dd>
              <span className={styles.big}>{fmt(cigarettes, 1)}</span> cigarettes&apos; worth of PM2.5 a day
            </dd>
            <dd className={styles.small}>{fmt(totals.lungsUgPerDay)} µg of fine particles not inhaled</dd>
          </div>
          <div data-tone="climate">
            <dt>Off the climate bill</dt>
            <dd>
              <span className={styles.big}>{fmt(totals.co2KgPerWeek, 1)}</span> kg CO₂ a week
            </dd>
            <dd className={styles.small}>{fmt(totals.co2KgPerWeek * 52)} kg over a year</dd>
          </div>
          <div data-tone="smog">
            <dt>Smog you stop adding</dt>
            <dd>
              <span className={styles.big}>{fmt(totals.smogGPerWeek, 1)}</span> g PM2.5 a week
            </dd>
            <dd className={styles.small}>From exhaust, road dust and burning</dd>
          </div>
        </dl>
      </section>

      {plan.careNote && (
        <aside className={styles.care} aria-label="Care note">
          <h3>For the people most at risk</h3>
          <p>{plan.careNote}</p>
        </aside>
      )}

      <section aria-labelledby="routine-title" className={styles.section}>
        <div className={styles.sectionHead}>
          <h3 id="routine-title">Today, hour by hour</h3>
          {plan.cleanWindow && (
            <p className={styles.lede}>
              Built around your cleanest window, {formatHour(plan.cleanWindow.start)}–{formatHour(plan.cleanWindow.end)}.
            </p>
          )}
        </div>
        <ol className={styles.timeline}>
          {plan.routine.map((step) => (
            <li key={`${step.time}-${step.title}`}>
              <time className={styles.time}>{step.time}</time>
              <div>
                <p className={styles.stepTitle}>{step.title}</p>
                <p className={styles.stepDetail}>{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {groups.map((group) => (
        <section key={group.kind} aria-labelledby={`group-${group.kind}`} className={styles.section}>
          <div className={styles.sectionHead}>
            <h3 id={`group-${group.kind}`}>{KIND_HEADINGS[group.kind].title}</h3>
            <p className={styles.lede}>{KIND_HEADINGS[group.kind].lede}</p>
          </div>
          <ul className={styles.items}>
            {group.items.map((item) => {
              const checked = committed.has(item.id);
              return (
                <li key={item.id} className={styles.item} data-off={!checked || undefined}>
                  <div className={styles.itemHead}>
                    <h4 id={`item-${item.id}`}>{item.title}</h4>
                    <label className={styles.commit}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(item.id)}
                        aria-describedby={`item-${item.id}`}
                      />
                      <span>I&apos;ll do this</span>
                    </label>
                  </div>
                  <p>{item.why}</p>
                  <ol className={styles.steps}>
                    {item.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                  <ImpactChips item={item} />
                  <details className={styles.basis}>
                    <summary>How we worked this out</summary>
                    <p>{item.impact.basis}</p>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

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
