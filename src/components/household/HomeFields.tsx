"use client";

import { COOKING_FUELS, HEATING_SOURCES } from "@/lib/domain";
import { COOKING_LABELS, HEATING_LABELS } from "@/lib/labels";
import { keysOf, pickOption } from "@/lib/objects";
import styles from "../HouseholdForm.module.css";
import type { FieldGroupProps } from "./fields";

interface SelectProps<T extends string> {
  label: string;
  allowed: readonly T[];
  options: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
}

/** A labelled native select over a fixed set of options; unknown values keep the current choice. */
function OptionSelect<T extends string>({ label, allowed, options, value, onChange }: SelectProps<T>) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(pickOption(allowed, e.target.value, value))}>
        {keysOf(options).map((key) => (
          <option key={key} value={key}>
            {options[key]}
          </option>
        ))}
      </select>
    </label>
  );
}

/** The things inside the home that change indoor air: a purifier, the cooking fuel and the heating. */
export function HomeFields({ value, set }: FieldGroupProps) {
  return (
    <fieldset className={styles.group}>
      <legend>At home</legend>
      <label className={styles.switch}>
        <input
          type="checkbox"
          role="switch"
          checked={value.hasPurifier}
          onChange={(e) => set("hasPurifier", e.target.checked)}
        />
        <span>We have an air purifier</span>
      </label>
      <div className={styles.selects}>
        <OptionSelect
          label="Cooking fuel"
          allowed={COOKING_FUELS}
          options={COOKING_LABELS}
          value={value.cookingFuel}
          onChange={(v) => set("cookingFuel", v)}
        />
        <OptionSelect
          label="Winter heating"
          allowed={HEATING_SOURCES}
          options={HEATING_LABELS}
          value={value.heating}
          onChange={(v) => set("heating", v)}
        />
      </div>
    </fieldset>
  );
}
