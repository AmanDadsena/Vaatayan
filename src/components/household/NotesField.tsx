"use client";

import { useId } from "react";
import { LIMITS } from "@/lib/domain";
import styles from "../HouseholdForm.module.css";

/** A short free-text note for the planner, with a live count of characters left. */
export function NotesField({ value, onChange }: { value: string; onChange: (notes: string) => void }) {
  const id = useId();
  const max = LIMITS.notes.max;
  return (
    <div className={styles.notes}>
      <label htmlFor={id}>
        Anything else? <span className={styles.hint}>Optional</span>
      </label>
      <textarea
        id={id}
        rows={3}
        maxLength={max}
        aria-describedby={`${id}-count`}
        placeholder="e.g. Grandmother walks to the temple at 6 am; school bus at 7:15"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span id={`${id}-count`} className={styles.hint}>
        {max - value.length} characters left
      </span>
    </div>
  );
}
