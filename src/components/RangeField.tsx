"use client";

import { useId } from "react";
import styles from "./RangeField.module.css";

interface Props {
  label: string;
  /** The current value as people should read it, e.g. "12 km". */
  display: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Spoken value when it differs from the visible one. */
  valueText?: string;
  /** Use "dark" on dark panels. */
  tone?: "light" | "dark";
}

/** A labelled slider that shows its current value next to the label. */
export function RangeField({ label, display, value, min, max, step = 1, onChange, valueText, tone = "light" }: Props) {
  const id = useId();
  return (
    <div className={styles.range} data-tone={tone}>
      <label htmlFor={id}>
        {label} <output htmlFor={id}>{display}</output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
