"use client";

import { useId } from "react";
import { useNumberInput } from "@/hooks/useNumberInput";
import styles from "./Stepper.module.css";

/** A whole-number field with − and + buttons, clamped to a range. */
export function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const id = useId();
  const input = useNumberInput(value, onChange, { min, max, integer: true });
  return (
    <div className={styles.stepper}>
      <label htmlFor={id} className={styles.stepLabel}>
        {label}
        <span className={styles.hint}>{hint}</span>
      </label>
      <div className={styles.stepControls}>
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          −
        </button>
        <input id={id} type="number" inputMode="numeric" min={min} max={max} {...input} />
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          +
        </button>
      </div>
    </div>
  );
}
