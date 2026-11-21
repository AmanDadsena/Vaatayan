"use client";

import { useId } from "react";
import { COMMUTE_LABELS } from "@/lib/labels";
import type { Delta } from "@/lib/simulator";
import { ChoicePills } from "../ChoicePills";
import { RangeField } from "../RangeField";
import styles from "../ImpactLab.module.css";
import { DeltaFigures } from "./DeltaFigures";
import { ModeBars } from "./ModeBars";
import type { SectionProps, UpdateSetting } from "./settings";

const PM_PRESETS = [
  { label: "Clean day", value: 15 },
  { label: "Typical winter", value: 90 },
  { label: "Severe smog", value: 250 },
];

/** Buttons that set the outdoor PM2.5 the comparison runs on. */
function PmPresets({ pm25, update }: { pm25: number; update: UpdateSetting }) {
  return (
    <fieldset className={styles.presets}>
      <legend>Outdoor PM2.5 to compare on</legend>
      <div>
        {PM_PRESETS.map((p) => (
          <button key={p.value} type="button" aria-pressed={pm25 === p.value} onClick={() => update("pm25")(p.value)}>
            {p.label}
            <small>{p.value} µg/m³</small>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Compares today's commute with another mode, for CO₂ and for the dose breathed on the way. */
export function CommuteSection({ settings, update, delta }: SectionProps & { delta: Delta }) {
  const id = useId();
  const { from, to, km, days, pm25 } = settings;

  return (
    <section className={styles.section} aria-labelledby={`${id}-commute`}>
      <div className={styles.sectionHead}>
        <h2 id={`${id}-commute`}>Your commute</h2>
        <p>The trip you make most often is usually your biggest lever, for your lungs and the city&apos;s.</p>
      </div>
      <div className={styles.split}>
        <div className={styles.controls}>
          <ChoicePills
            legend="Today you travel by"
            name={`${id}-from`}
            options={COMMUTE_LABELS}
            value={from}
            onChange={update("from")}
            exclude={["home"]}
          />
          <ChoicePills
            legend="What if you switched to"
            name={`${id}-to`}
            options={COMMUTE_LABELS}
            value={to}
            onChange={update("to")}
          />
          <RangeField
            label="Distance each way"
            display={`${km} km`}
            min={1}
            max={60}
            value={km}
            onChange={update("km")}
          />
          <RangeField
            label="Days a week"
            display={String(days)}
            min={1}
            max={7}
            value={days}
            onChange={update("days")}
          />
          <PmPresets pm25={pm25} update={update} />
        </div>
        <div className={`panel ${styles.result}`}>
          <p className={styles.resultLead}>
            Switching from {COMMUTE_LABELS[from].toLowerCase()} to {COMMUTE_LABELS[to].toLowerCase()}:
          </p>
          <DeltaFigures delta={delta} label="Commute change" />
          <ModeBars km={km} days={days} pm25={pm25} from={from} to={to} />
        </div>
      </div>
    </section>
  );
}
