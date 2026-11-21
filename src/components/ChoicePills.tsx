"use client";

import type { ReactNode } from "react";
import { keysOf } from "@/lib/objects";
import styles from "./ChoicePills.module.css";

/** The fieldset, legend and pill row both pill groups share. */
function PillGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className={styles.choice}>
      <legend>{legend}</legend>
      <div className={styles.pills}>{children}</div>
    </fieldset>
  );
}

interface ChoiceProps<T extends string> {
  legend: string;
  name: string;
  options: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
  /** Options to leave out, e.g. the current choice when picking an alternative. */
  exclude?: T[];
}

/** A radio group styled as pills; native radios keep keyboard and screen reader behaviour. */
export function ChoicePills<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  exclude = [],
}: ChoiceProps<T>) {
  return (
    <PillGroup legend={legend}>
      {keysOf(options)
        .filter((key) => !exclude.includes(key))
        .map((key) => (
          <label key={key} className={styles.pill}>
            <input type="radio" name={name} value={key} checked={value === key} onChange={() => onChange(key)} />
            <span>{options[key]}</span>
          </label>
        ))}
    </PillGroup>
  );
}

interface CheckProps<T extends string> {
  legend: string;
  options: Record<T, string>;
  value: readonly T[];
  onChange: (value: T[]) => void;
}

/** A checkbox group styled as pills, for picking any number of options. */
export function CheckPills<T extends string>({ legend, options, value, onChange }: CheckProps<T>) {
  const toggle = (key: T) => onChange(value.includes(key) ? value.filter((x) => x !== key) : [...value, key]);
  return (
    <PillGroup legend={legend}>
      {keysOf(options).map((key) => (
        <label key={key} className={styles.pill}>
          <input type="checkbox" checked={value.includes(key)} onChange={() => toggle(key)} />
          <span>{options[key]}</span>
        </label>
      ))}
    </PillGroup>
  );
}
