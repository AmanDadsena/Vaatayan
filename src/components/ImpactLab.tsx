"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { formatNumber } from "@/lib/format";
import { COMMUTE_LABELS } from "@/lib/labels";
import { loadLocal } from "@/lib/client";
import { readStoredHousehold } from "@/lib/domain";
import type { CommuteMode, CookingFuel, HeatingSource } from "@/lib/schemas";
import { addDeltas, compareCommute, compareFuel, COOKING, HEATING, scaleUp } from "@/lib/simulator";
import { PHOTOS } from "@/lib/photos";
import { ChoicePills } from "./ChoicePills";
import { DeltaFigures } from "./impact-lab/DeltaFigures";
import { ModeBars } from "./impact-lab/ModeBars";
import { Photo } from "./Photo";
import { RangeField } from "./RangeField";
import styles from "./ImpactLab.module.css";
const PM_PRESETS = [
  { label: "Clean day", value: 15 },
  { label: "Typical winter", value: 90 },
  { label: "Severe smog", value: 250 },
];

const HOUSEHOLD_STEPS = [1, 10, 100, 1_000, 10_000, 100_000];

const HEATING_LABELS = Object.fromEntries(Object.entries(HEATING).map(([k, v]) => [k, v.label])) as Record<
  HeatingSource,
  string
>;
const COOKING_LABELS = Object.fromEntries(Object.entries(COOKING).map(([k, v]) => [k, v.label])) as Record<
  CookingFuel,
  string
>;

export function ImpactLab() {
  const id = useId();
  const [from, setFrom] = useState<CommuteMode>("car");
  const [to, setTo] = useState<CommuteMode>("metro");
  const [km, setKm] = useState(12);
  const [days, setDays] = useState(5);
  const [pm25, setPm25] = useState(90);
  const [heatFrom, setHeatFrom] = useState<HeatingSource>("kerosene");
  const [heatTo, setHeatTo] = useState<HeatingSource>("electric");
  const [cookFrom, setCookFrom] = useState<CookingFuel>("lpg");
  const [cookTo, setCookTo] = useState<CookingFuel>("lpg");
  const [people, setPeople] = useState(4);
  const [stepIndex, setStepIndex] = useState(3);

  // Start from the household saved on the Today page, if there is one.
  useEffect(() => {
    const saved = loadLocal("vaatayan.household.v1", readStoredHousehold);
    if (!saved) return;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
    if (saved.commuteMode !== "home") {
      setFrom(saved.commuteMode);
      setTo(saved.commuteMode === "metro" ? "walk-cycle" : "metro");
      setKm(Math.max(1, saved.commuteKm));
    }
    setHeatFrom(saved.heating);
    setHeatTo(saved.heating === "electric" ? "none" : "electric");
    setCookFrom(saved.cookingFuel);
    setCookTo(saved.cookingFuel === "biomass" ? "lpg" : saved.cookingFuel);
    setPeople(saved.adults + saved.children + saved.elders);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

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
  const households = HOUSEHOLD_STEPS[stepIndex] ?? 1;
  const scaled = scaleUp(total, households);

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
              onChange={setFrom}
              exclude={["home"]}
            />
            <ChoicePills
              legend="What if you switched to"
              name={`${id}-to`}
              options={COMMUTE_LABELS}
              value={to}
              onChange={setTo}
            />
            <RangeField label="Distance each way" display={`${km} km`} min={1} max={60} value={km} onChange={setKm} />
            <RangeField label="Days a week" display={String(days)} min={1} max={7} value={days} onChange={setDays} />
            <fieldset className={styles.presets}>
              <legend>Outdoor PM2.5 to compare on</legend>
              <div>
                {PM_PRESETS.map((p) => (
                  <button key={p.value} type="button" aria-pressed={pm25 === p.value} onClick={() => setPm25(p.value)}>
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
              onChange={setHeatFrom}
            />
            <ChoicePills
              legend="What if you used"
              name={`${id}-ht`}
              options={HEATING_LABELS}
              value={heatTo}
              onChange={setHeatTo}
            />
            <ChoicePills
              legend="You cook with"
              name={`${id}-cf`}
              options={COOKING_LABELS}
              value={cookFrom}
              onChange={setCookFrom}
            />
            <ChoicePills
              legend="What if you used"
              name={`${id}-ct`}
              options={COOKING_LABELS}
              value={cookTo}
              onChange={setCookTo}
            />
          </div>
          <div className={styles.result}>
            <p className={styles.resultLead}>For a home of {people}:</p>
            <DeltaFigures delta={fuel} label="Heating and cooking change" />
            <ul className={styles.notes}>
              <li>
                <strong>{HEATING[heatTo].label}.</strong> {HEATING[heatTo].note}
              </li>
              {cookTo !== cookFrom && (
                <li>
                  <strong>{COOKING[cookTo].label}.</strong> {COOKING[cookTo].note}
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.multiply}`} aria-labelledby={`${id}-scale`}>
        <div className={styles.sectionHead}>
          <h2 id={`${id}-scale`}>Now multiply it</h2>
          <p>Smog is shared. Here is what your changes add up to when neighbours make them too.</p>
        </div>
        <RangeField
          label="Households making the same changes"
          display={formatNumber(households)}
          min={0}
          max={HOUSEHOLD_STEPS.length - 1}
          value={stepIndex}
          valueText={`${formatNumber(households)} households`}
          onChange={setStepIndex}
          tone="dark"
        />
        <dl className={styles.scaled} aria-live="polite">
          <div>
            <dt>CO₂ a year</dt>
            <dd>
              {formatNumber(scaled.co2TonnesPerYear, 1)} <span>tonnes</span>
            </dd>
          </div>
          <div>
            <dt>Like taking off the road</dt>
            <dd>
              {formatNumber(Math.max(0, scaled.carsEquivalent))} <span>cars</span>
            </dd>
          </div>
          <div>
            <dt>Smog not made</dt>
            <dd>
              {formatNumber(scaled.smogKgPerYear, 1)} <span>kg PM2.5 a year</span>
            </dd>
          </div>
        </dl>
        <p className={styles.footnote}>
          Estimates using typical Indian emission factors and a grid factor of 0.71 kg CO₂ per kWh. A car here means
          about 10,000 km a year in a petrol hatchback.
        </p>
      </section>
    </>
  );
}
