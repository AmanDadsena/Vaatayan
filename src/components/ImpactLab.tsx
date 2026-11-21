"use client";

import { useId, useMemo, useState } from "react";
import { readStoredHousehold, STORAGE_KEYS } from "@/lib/domain";
import { seedLabSettings, type LabSettings } from "@/lib/labSettings";
import { COMMUTE_LABELS, COOKING_LABELS, HEATING_LABELS } from "@/lib/labels";
import { PHOTOS } from "@/lib/photos";
import { addDeltas, compareCommute, compareFuel, COOKING, HEATING } from "@/lib/simulator";
import { ChoicePills } from "./ChoicePills";
import { DeltaFigures } from "./impact-lab/DeltaFigures";
import { ModeBars } from "./impact-lab/ModeBars";
import { ScaleUpSection } from "./impact-lab/ScaleUpSection";
import { Photo } from "./Photo";
import { RangeField } from "./RangeField";
import { useStoredState } from "./useStoredState";
import styles from "./ImpactLab.module.css";
const PM_PRESETS = [
  { label: "Clean day", value: 15 },
  { label: "Typical winter", value: 90 },
  { label: "Severe smog", value: 250 },
];

export function ImpactLab() {
  const id = useId();
  // Start from the household saved on the Today page; only the user's own edits live in state.
  const [saved] = useStoredState(STORAGE_KEYS.household, readStoredHousehold, null);
  const [edits, setEdits] = useState<Partial<LabSettings>>({});
  const { from, to, km, days, pm25, heatFrom, heatTo, cookFrom, cookTo, people, stepIndex } = {
    ...seedLabSettings(saved),
    ...edits,
  };
  const update =
    <K extends keyof LabSettings>(key: K) =>
    (value: LabSettings[K]) =>
      setEdits((current) => ({ ...current, [key]: value }));

  const commute = useMemo(() => compareCommute(from, to, km, days, pm25), [from, to, km, days, pm25]);
  const fuel = useMemo(
    () =>
      addDeltas(
        compareFuel(HEATING[heatFrom], HEATING[heatTo], people),
        compareFuel(COOKING[cookFrom], COOKING[cookTo], people),
      ),
    [heatFrom, heatTo, cookFrom, cookTo, people],
  );
  const total = addDeltas(commute, fuel);

  return (
    <>
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
            <fieldset className={styles.presets}>
              <legend>Outdoor PM2.5 to compare on</legend>
              <div>
                {PM_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    aria-pressed={pm25 === p.value}
                    onClick={() => update("pm25")(p.value)}
                  >
                    {p.label}
                    <small>{p.value} µg/m³</small>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className={styles.result}>
            <p className={styles.resultLead}>
              Switching from {COMMUTE_LABELS[from].toLowerCase()} to {COMMUTE_LABELS[to].toLowerCase()}:
            </p>
            <DeltaFigures delta={commute} label="Commute change" />
            <ModeBars km={km} days={days} pm25={pm25} from={from} to={to} />
          </div>
        </div>
      </section>

      <section className={styles.band} aria-labelledby={`${id}-transit`}>
        <Photo photo={PHOTOS.metro} caption="Delhi Metro, red line." />
        <div>
          <h2 id={`${id}-transit`}>Why shared transit wins twice</h2>
          <p>
            Per passenger-kilometre, a metro trip emits roughly a tenth of the CO₂ of driving alone, and almost none of
            the tailpipe and brake dust that hangs at street level.
          </p>
          <p>
            It protects you too: closed, filtered carriages typically expose riders to less PM2.5 than open
            two-wheelers, autos or walking beside traffic. Pair the last stretch with an N95 and you cut both sides of
            the problem.
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby={`${id}-fuel`}>
        <div className={styles.sectionHead}>
          <h2 id={`${id}-fuel`}>Heating and cooking</h2>
          <p>What burns inside your home lands in your family&apos;s lungs first, then the street&apos;s.</p>
        </div>
        <div className={styles.split}>
          <div className={styles.controls}>
            <ChoicePills
              legend="You heat with"
              name={`${id}-hf`}
              options={HEATING_LABELS}
              value={heatFrom}
              onChange={update("heatFrom")}
            />
            <ChoicePills
              legend="What if you used"
              name={`${id}-ht`}
              options={HEATING_LABELS}
              value={heatTo}
              onChange={update("heatTo")}
            />
            <ChoicePills
              legend="You cook with"
              name={`${id}-cf`}
              options={COOKING_LABELS}
              value={cookFrom}
              onChange={update("cookFrom")}
            />
            <ChoicePills
              legend="What if you used"
              name={`${id}-ct`}
              options={COOKING_LABELS}
              value={cookTo}
              onChange={update("cookTo")}
            />
          </div>
          <div className={styles.result}>
            <p className={styles.resultLead}>For a home of {people}:</p>
            <DeltaFigures delta={fuel} label="Heating and cooking change" />
            <ul className={styles.notes}>
              <li>
                <strong>{HEATING_LABELS[heatTo]}.</strong> {HEATING[heatTo].note}
              </li>
              {cookTo !== cookFrom && (
                <li>
                  <strong>{COOKING_LABELS[cookTo]}.</strong> {COOKING[cookTo].note}
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>

      <ScaleUpSection total={total} stepIndex={stepIndex} onStepChange={update("stepIndex")} />
    </>
  );
}
