"use client";

import styles from "./ChoicePills.module.css";

interface Props<T extends string> {
  legend: string;
  name: string;
  options: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
  /** Options to leave out, e.g. the current choice when picking an alternative. */
  exclude?: T[];
}

/** A radio group styled as pills; native radios keep keyboard and screen reader behaviour. */
export function ChoicePills<T extends string>({ legend, name, options, value, onChange, exclude = [] }: Props<T>) {
  return (
    <fieldset className={styles.choice}>
      <legend>{legend}</legend>
      <div className={styles.pills}>
        {(Object.keys(options) as T[])
          .filter((key) => !exclude.includes(key))
          .map((key) => (
            <label key={key} className={styles.pill}>
              <input type="radio" name={name} value={key} checked={value === key} onChange={() => onChange(key)} />
              <span>{options[key]}</span>
            </label>
          ))}
      </div>
    </fieldset>
  );
}
