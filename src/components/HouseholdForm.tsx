"use client";

import { useId } from "react";
import { CONDITIONS } from "@/lib/domain";
import type { Condition, CookingFuel, HeatingSource, Household } from "@/lib/schemas";
import { COMMUTE_LABELS, CONDITION_LABELS, COOKING_LABELS, EXERCISE_LABELS, HEATING_LABELS } from "@/lib/labels";
import { ChoicePills } from "./ChoicePills";
import { useNumberInput } from "./useNumberInput";
import styles from "./HouseholdForm.module.css";

interface Props {
  value: Household;
  onChange: (next: Household) => void;
  onSubmit: () => void;
  busy: boolean;
  disabled: boolean;
}

function Stepper({
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

export function HouseholdForm({ value, onChange, onSubmit, busy, disabled }: Props) {
  const id = useId();
  const set = <K extends keyof Household>(key: K, v: Household[K]) => onChange({ ...value, [key]: v });

  const toggleCondition = (c: Condition) =>
    set(
      "conditions",
      value.conditions.includes(c) ? value.conditions.filter((x) => x !== c) : [...value.conditions, c],
    );

  return (
    <form
      className={styles.form}
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

      <fieldset className={styles.group}>
        <legend>Who lives with you</legend>
        <div className={styles.steppers}>
          <Stepper
            label="Adults"
            hint="18 to 64"
            value={value.adults}
            min={1}
            max={12}
            onChange={(n) => set("adults", n)}
          />
          <Stepper
            label="Children"
            hint="under 18"
            value={value.children}
            min={0}
            max={12}
            onChange={(n) => set("children", n)}
          />
          <Stepper
            label="Elders"
            hint="65 and over"
            value={value.elders}
            min={0}
            max={12}
            onChange={(n) => set("elders", n)}
          />
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend>Anyone with these conditions?</legend>
        <div className={styles.pills}>
          {CONDITIONS.map((c) => (
            <label key={c} className={styles.pill}>
              <input type="checkbox" checked={value.conditions.includes(c)} onChange={() => toggleCondition(c)} />
              <span>{CONDITION_LABELS[c]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <ChoicePills
        legend="How do you usually get to work or school?"
        name={`${id}-commute`}
        options={COMMUTE_LABELS}
        value={value.commuteMode}
        onChange={(v) => set("commuteMode", v)}
      />

      {value.commuteMode !== "home" && (
        <div className={styles.range}>
          <label htmlFor={`${id}-km`}>
            One-way distance <output htmlFor={`${id}-km`}>{value.commuteKm} km</output>
          </label>
          <input
            id={`${id}-km`}
            type="range"
            min={1}
            max={60}
            step={1}
            value={Math.max(1, value.commuteKm)}
            onChange={(e) => set("commuteKm", Number(e.target.value))}
          />
        </div>
      )}

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
          <label>
            Cooking fuel
            <select value={value.cookingFuel} onChange={(e) => set("cookingFuel", e.target.value as CookingFuel)}>
              {(Object.keys(COOKING_LABELS) as CookingFuel[]).map((k) => (
                <option key={k} value={k}>
                  {COOKING_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Winter heating
            <select value={value.heating} onChange={(e) => set("heating", e.target.value as HeatingSource)}>
              {(Object.keys(HEATING_LABELS) as HeatingSource[]).map((k) => (
                <option key={k} value={k}>
                  {HEATING_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <ChoicePills
        legend="When do you exercise outdoors?"
        name={`${id}-exercise`}
        options={EXERCISE_LABELS}
        value={value.exercise}
        onChange={(v) => set("exercise", v)}
      />

      <div className={styles.notes}>
        <label htmlFor={`${id}-notes`}>
          Anything else? <span className={styles.hint}>Optional</span>
        </label>
        <textarea
          id={`${id}-notes`}
          rows={3}
          maxLength={280}
          aria-describedby={`${id}-notes-count`}
          placeholder="e.g. Grandmother walks to the temple at 6 am; school bus at 7:15"
          value={value.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
        <span id={`${id}-notes-count`} className={styles.hint}>
          {280 - value.notes.length} characters left
        </span>
      </div>

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
