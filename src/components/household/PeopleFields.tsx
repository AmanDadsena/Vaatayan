"use client";

import { LIMITS } from "@/lib/domain";
import { Stepper } from "../Stepper";
import styles from "../HouseholdForm.module.css";
import type { FieldGroupProps } from "./fields";

const PEOPLE = [
  { key: "adults", label: "Adults", hint: "18 to 64", min: 1 },
  { key: "children", label: "Children", hint: "under 18", min: 0 },
  { key: "elders", label: "Elders", hint: "65 and over", min: 0 },
] as const;

/** How many adults, children and elders live in the home. */
export function PeopleFields({ value, set }: FieldGroupProps) {
  return (
    <fieldset className={styles.group}>
      <legend>Who lives with you</legend>
      <div className={styles.steppers}>
        {PEOPLE.map((p) => (
          <Stepper
            key={p.key}
            label={p.label}
            hint={p.hint}
            value={value[p.key]}
            min={p.min}
            max={LIMITS.people.max}
            onChange={(n) => set(p.key, n)}
          />
        ))}
      </div>
    </fieldset>
  );
}
