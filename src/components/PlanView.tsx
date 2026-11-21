"use client";

import { useMemo, useState } from "react";
import { categorize } from "@/lib/aqi";
import { formatNumber } from "@/lib/format";
import { clockInWindow, formatHour, readingAtClock, type HourlyReading } from "@/lib/breathWindow";
import { cigarettesAvoided, METHOD_NOTES, totalImpact, type ActionKind } from "@/lib/impact";
import type { Plan, PlanItem } from "@/lib/planner";
import styles from "./PlanView.module.css";

interface Props {
  plan: Plan;
  notice?: string;
  /** Hourly forecast, so each routine step can show the air at that hour. */
  hourly?: HourlyReading[];
}

const MAX_CIGARETTES = 20;

/** One glyph per cigarette's worth avoided, the last one partial. Decorative: the number is in text. */
function CigaretteRow({ count }: { count: number }) {
  const shown = Math.min(count, MAX_CIGARETTES);
  const whole = Math.floor(shown);
  const part = shown - whole;
  const glyphs = Array.from({ length: Math.ceil(shown) }, (_, i) => (i < whole ? 1 : part));
  return (
    <span className={styles.cigs}>
      {glyphs.map((fill, i) => (
        <svg key={i} viewBox="0 0 48 12" className={styles.cig} style={{ opacity: fill < 1 ? 0.35 + fill * 0.65 : 1 }}>
          <rect x="1" y="2" width="34" height="8" rx="2" className={styles.cigBody} />
          <rect x="35" y="2" width="12" height="8" rx="2" className={styles.cigTip} />
          <line x1="2" y1="11" x2="46" y2="1" className={styles.cigStrike} />
        </svg>
      ))}
      {count > MAX_CIGARETTES && <span className={styles.more}>+{fmt(count - MAX_CIGARETTES, 0)}</span>}
    </span>
  );
}

const KIND_HEADINGS: Record<ActionKind, { title: string; lede: string }> = {
  routine: { title: "Your day", lede: "Small timing changes that cut what you breathe." },
  indoor: { title: "Indoor air", lede: "Make home the cleanest air you breathe all day." },
  swap: { title: "Lower-emission swaps", lede: "Choices that leave less smog for everyone." },
};

const fmt = formatNumber;

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

export function PlanView({ plan, notice, hourly = [] }: Props) {
  const [committed, setCommitted] = useState<Set<string>>(() => new Set(plan.items.map((i) => i.id)));

  const totals = useMemo(() => totalImpact(plan.items.filter((i) => committed.has(i.id))), [plan.items, committed]);
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
          <div data-tone="lungs" className={styles.hero}>
            <dt>Kept out of your family&apos;s lungs, every day</dt>
            <dd className={styles.heroLine}>
              <span className={styles.huge}>{fmt(cigarettes, 1)}</span>
              <span>cigarettes&apos; worth of PM2.5</span>
            </dd>
            <dd aria-hidden="true">
              <CigaretteRow count={cigarettes} />
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
              Built around your cleanest window, {formatHour(plan.cleanWindow.start)}–{formatHour(plan.cleanWindow.end)}
              .
            </p>
          )}
        </div>
        <ol className={styles.timeline}>
          {plan.routine.map((step) => {
            const reading = readingAtClock(hourly, step.time);
            const level = reading ? categorize(reading.aqi).level : null;
            const clean = clockInWindow(step.time, plan.cleanWindow);
            return (
              <li key={`${step.time}-${step.title}`} data-clean={clean || undefined}>
                <time className={styles.time}>{step.time}</time>
                <span
                  className={styles.node}
                  aria-hidden="true"
                  style={level ? { background: `var(--aqi-${level})` } : undefined}
                />
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>{step.title}</p>
                  <p className={styles.stepDetail}>{step.detail}</p>
                  {(reading || clean) && (
                    <p className={styles.stepMeta}>
                      {reading && (
                        <span className={styles.stepAqi}>
                          Forecast AQI {reading.aqi}, {categorize(reading.aqi).label.toLowerCase()}
                        </span>
                      )}
                      {clean && <span className={styles.cleanTag}>In your clean window</span>}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
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
