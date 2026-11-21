"use client";

import { useId } from "react";
import type { Household } from "@/lib/schemas";
import { COMMUTE_LABELS, CONDITION_LABELS, EXERCISE_LABELS } from "@/lib/labels";
import { CheckPills, ChoicePills } from "./ChoicePills";
import { HomeFields } from "./household/HomeFields";
import { NotesField } from "./household/NotesField";
import { PeopleFields } from "./household/PeopleFields";
import type { SetField } from "./household/fields";
import { RangeField } from "./RangeField";
import styles from "./HouseholdForm.module.css";

interface Props {
  value: Household;
  onChange: (next: Household) => void;
  onSubmit: () => void;
  busy: boolean;
  disabled: boolean;
}

/** The household details the plan is tailored to: people, health, commute, home and habits. */
export function HouseholdForm({ value, onChange, onSubmit, busy, disabled }: Props) {
  const id = useId();
  const set: SetField = (key, v) => onChange({ ...value, [key]: v });

  return (
    <form
      className={`panel ${styles.form}`}
      aria-labelledby={`${id}-title`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className={styles.head}>
        <h2 id={`${id}-title`}>Your household</h2>
        <p className={styles.lede}>A few details so the plan fits your day. They stay on this device.</p>
      </div>

      <PeopleFields value={value} set={set} />

      <CheckPills
        legend="Anyone with these conditions?"
        options={CONDITION_LABELS}
        value={value.conditions}
        onChange={(v) => set("conditions", v)}
      />

      <ChoicePills
        legend="How do you usually get to work or school?"
        name={`${id}-commute`}
        options={COMMUTE_LABELS}
        value={value.commuteMode}
        onChange={(v) => set("commuteMode", v)}
      />

      {value.commuteMode !== "home" && (
        <RangeField
          label="One-way distance"
          display={`${value.commuteKm} km`}
          min={1}
          max={60}
          value={Math.max(1, value.commuteKm)}
          onChange={(km) => set("commuteKm", km)}
        />
      )}

      <HomeFields value={value} set={set} />

      <ChoicePills
        legend="When do you exercise outdoors?"
        name={`${id}-exercise`}
        options={EXERCISE_LABELS}
        value={value.exercise}
        onChange={(v) => set("exercise", v)}
      />

      <NotesField value={value.notes} onChange={(notes) => set("notes", notes)} />

      <button
        type="submit"
        className={styles.submit}
        disabled={disabled || busy}
        aria-describedby={`${id}-submit-hint`}
      >
        {busy ? "Writing your plan…" : "Make today's plan"}
      </button>
      <p id={`${id}-submit-hint`} className={styles.hint}>
        {disabled ? "Waiting for live air data first." : "Uses today's live forecast for your location."}
      </p>
    </form>
  );
}
