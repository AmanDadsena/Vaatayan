"use client";

import { useId } from "react";
import { formatNumber } from "@/lib/format";
import { scaleUp, type Delta } from "@/lib/simulator";
import { RangeField } from "../RangeField";
import styles from "../ImpactLab.module.css";

/** Slider stops for "how many households": one step per order of magnitude. */
export const HOUSEHOLD_STEPS = [1, 10, 100, 1_000, 10_000, 100_000] as const;

interface Props {
  /** The household's own weekly change, before multiplying. */
  total: Delta;
  stepIndex: number;
  onStepChange: (index: number) => void;
}

/** "Now multiply it": what the same changes add up to across many households. */
export function ScaleUpSection({ total, stepIndex, onStepChange }: Props) {
  const id = useId();
  const households = HOUSEHOLD_STEPS[stepIndex] ?? 1;
  const scaled = scaleUp(total, households);

  return (
    <section className={`${styles.section} ${styles.multiply}`} aria-labelledby={`${id}-scale`}>
      <div className={styles.sectionHead}>
        <h2 id={`${id}-scale`}>Now multiply it</h2>
        <p>Smog is shared. Here is what your changes add up to when neighbours make them too.</p>
      </div>
      <RangeField
        label="Households making the same changes"
        display={formatNumber(households)}
        min={0}
        max={HOUSEHOLD_STEPS.length - 1}
        value={stepIndex}
        valueText={`${formatNumber(households)} households`}
        onChange={onStepChange}
        tone="dark"
      />
      <dl className={styles.scaled} aria-live="polite">
        <div>
          <dt>CO₂ a year</dt>
          <dd>
            {formatNumber(scaled.co2TonnesPerYear, 1)} <span>tonnes</span>
          </dd>
        </div>
        <div>
          <dt>Like taking off the road</dt>
          <dd>
            {formatNumber(Math.max(0, scaled.carsEquivalent))} <span>cars</span>
          </dd>
        </div>
        <div>
          <dt>Smog not made</dt>
          <dd>
            {formatNumber(scaled.smogKgPerYear, 1)} <span>kg PM2.5 a year</span>
          </dd>
        </div>
      </dl>
      <p className={styles.footnote}>
        Estimates using typical Indian emission factors and a grid factor of 0.71 kg CO₂ per kWh. A car here means about
        10,000 km a year in a petrol hatchback.
      </p>
    </section>
  );
}
