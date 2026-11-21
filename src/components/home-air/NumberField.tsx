"use client";

import { useId } from "react";
import { useNumberInput } from "@/hooks/useNumberInput";
import styles from "../HomeAir.module.css";

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  unit,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
}) {
  const id = useId();
  const input = useNumberInput(value, onChange, { min, max });
  return (
    <div className={styles.numberField}>
      <label htmlFor={id}>{label}</label>
      <div>
        <input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} {...input} />
        <span aria-hidden="true">{unit}</span>
      </div>
    </div>
  );
}
