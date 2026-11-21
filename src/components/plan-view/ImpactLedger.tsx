import { formatNumber } from "@/lib/format";
import type { Impact } from "@/lib/impact";
import styles from "../PlanView.module.css";

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
      {count > MAX_CIGARETTES && <span className={styles.more}>+{formatNumber(count - MAX_CIGARETTES)}</span>}
    </span>
  );
}

interface Props {
  /** How many actions are ticked. */
  count: number;
  totals: Omit<Impact, "basis">;
  cigarettes: number;
}

/** The payoff: what the ticked actions keep out of lungs, off the climate bill and out of the city's air. */
export function ImpactLedger({ count, totals, cigarettes }: Props) {
  return (
    <section className={styles.ledger} aria-labelledby="ledger-title">
      <h3 id="ledger-title">If you do the {count} things you&apos;ve ticked</h3>
      <dl className={styles.ledgerGrid} aria-live="polite">
        <div data-tone="lungs" className={styles.hero}>
          <dt>Kept out of your family&apos;s lungs, every day</dt>
          <dd className={styles.heroLine}>
            <span className={styles.huge}>{formatNumber(cigarettes, 1)}</span>
            <span>cigarettes&apos; worth of PM2.5</span>
          </dd>
          <dd aria-hidden="true">
            <CigaretteRow count={cigarettes} />
          </dd>
          <dd className={styles.small}>{formatNumber(totals.lungsUgPerDay)} µg of fine particles not inhaled</dd>
        </div>
        <div data-tone="climate">
          <dt>Off the climate bill</dt>
          <dd>
            <span className={styles.big}>{formatNumber(totals.co2KgPerWeek, 1)}</span> kg CO₂ a week
          </dd>
          <dd className={styles.small}>{formatNumber(totals.co2KgPerWeek * 52)} kg over a year</dd>
        </div>
        <div data-tone="smog">
          <dt>Smog you stop adding</dt>
          <dd>
            <span className={styles.big}>{formatNumber(totals.smogGPerWeek, 1)}</span> g PM2.5 a week
          </dd>
          <dd className={styles.small}>From exhaust, road dust and burning</dd>
        </div>
      </dl>
    </section>
  );
}
