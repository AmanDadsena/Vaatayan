"use client";

import { useId, useState } from "react";
import { categorize, aqiFromPm25 } from "@/lib/aqi";
import { concentrationForMixingHeight } from "@/lib/simulator";
import { formatNumber } from "@/lib/format";
import { RangeField } from "../RangeField";
import styles from "../SmogExplainer.module.css";
import { InversionScene } from "./InversionScene";

const MAX_H = 2000;
const PX_PER_M = 250 / MAX_H;
const BASE_PM_AT_1000M = 40;

const PRESETS = [
  { label: "Summer afternoon", height: 1800 },
  { label: "Winter afternoon", height: 800 },
  { label: "Winter night", height: 200 },
];

/** Drag the inversion "lid" and watch the same pollution crowd into a thinner layer. */
export function InversionLab() {
  const id = useId();
  const [height, setHeight] = useState(800);
  const pm = concentrationForMixingHeight(BASE_PM_AT_1000M, height);
  const category = categorize(aqiFromPm25(pm));

  return (
    <section className={styles.lab} aria-labelledby={`${id}-t`}>
      <div className={styles.labText}>
        <h2 id={`${id}-t`}>The lid on the city</h2>
        <p>
          On a normal day, air warmed by the ground rises and carries pollution kilometres up. On cold, still winter
          nights the ground cools fast and a layer of warmer air settles on top like a lid. This is a temperature
          inversion.
        </p>
        <p>
          The city makes roughly the same smoke and exhaust every day. What changes is how much air it gets mixed into.
          Drag the lid down and watch the same particles crowd together.
        </p>
        <div className={styles.presets} role="group" aria-label="Example conditions">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" aria-pressed={height === p.height} onClick={() => setHeight(p.height)}>
              {p.label}
            </button>
          ))}
        </div>
        <RangeField
          label="Height of the mixing layer"
          display={`${formatNumber(height)} m`}
          min={100}
          max={MAX_H}
          step={50}
          value={height}
          valueText={`${height} metres, PM2.5 about ${pm} micrograms per cubic metre`}
          onChange={setHeight}
        />
        <p className={styles.readout} aria-live="polite">
          Same emissions, PM2.5 near the ground: <strong>{pm} µg/m³</strong>
          <span data-level={category.level}>{category.label}</span>
        </p>
      </div>

      <figure className={styles.scene}>
        <InversionScene height={height} layerPx={height * PX_PER_M} density={Math.min(0.85, pm / 260)} />
        <figcaption className={styles.caption}>
          Illustration: the mixing layer can shrink from over a kilometre on summer afternoons to a few hundred metres
          on winter nights.
        </figcaption>
      </figure>
    </section>
  );
}
