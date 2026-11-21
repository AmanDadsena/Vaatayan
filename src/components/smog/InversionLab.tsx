"use client";

import { useId, useMemo, useState } from "react";
import { categorize, aqiFromPm25 } from "@/lib/aqi";
import { concentrationForMixingHeight } from "@/lib/simulator";
import { formatNumber } from "@/lib/format";
import { RangeField } from "../RangeField";
import styles from "../SmogExplainer.module.css";

const W = 640;
const GROUND = 300;
const MAX_H = 2000;
const PX_PER_M = 250 / MAX_H;
const BASE_PM_AT_1000M = 40;
const PARTICLES = 110;

/** Deterministic pseudo-random sequence so server and client render the same particles. */
function seeded(n: number) {
  let s = 42;
  return Array.from({ length: n }, () => {
    s = (s * 16807) % 2147483647;
    const u = s / 2147483647;
    s = (s * 16807) % 2147483647;
    const v = s / 2147483647;
    return { u, v };
  });
}

const PRESETS = [
  { label: "Summer afternoon", height: 1800 },
  { label: "Winter afternoon", height: 800 },
  { label: "Winter night", height: 200 },
];

/** Drag the inversion "lid" and watch the same pollution crowd into a thinner layer. */
export function InversionLab() {
  const id = useId();
  const [height, setHeight] = useState(800);
  const points = useMemo(() => seeded(PARTICLES), []);
  const layerPx = height * PX_PER_M;
  const pm = concentrationForMixingHeight(BASE_PM_AT_1000M, height);
  const category = categorize(aqiFromPm25(pm));
  const density = Math.min(0.85, pm / 260);

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
        <svg viewBox={`0 0 ${W} 330`} aria-hidden="true">
          <defs>
            <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--sky-high)" />
              <stop offset="1" stopColor="var(--sky-low)" />
            </linearGradient>
          </defs>
          <rect width={W} height={GROUND} fill={`url(#${id}-sky)`} />
          {/* warm air above the lid */}
          <rect
            className={styles.warm}
            x="0"
            width={W}
            height={Math.max(0, GROUND - layerPx)}
            fill="var(--warm-air)"
            opacity={height < 900 ? 0.75 : 0.2}
          />
          {/* skyline */}
          <path
            transform={`translate(0 ${GROUND * 0.5}) scale(1 0.5)`}
            d="M0 300v-30h30v-18h20v18h24v-40h14v-14h8v14h14v40h26v-24h34v24h18v-46l14-11 14 11v46h30v-14h24v-18h9v-6h6v6h9v32h38v-20h16v-20h28v40h20v-26h44v26h14v-60h5v-12h3v12h5v60h30v-10h38v-24h17v-14h11v14h17v34h28v-22h46v22h24v-42h30v42h34v-18h24v18h31v-30h18v30z"
            fill="var(--skyline)"
          />
          {/* mixed layer: drawn over the city so smog engulfs it */}
          <rect
            className={styles.layer}
            x="0"
            y={GROUND - layerPx}
            width={W}
            height={layerPx}
            fill="var(--smog-stone)"
            opacity={density}
          />
          <line className={styles.lid} x1="0" x2={W} y1={GROUND - layerPx} y2={GROUND - layerPx} />
          <text className={styles.lidLabel} x="12" y={Math.max(18, GROUND - layerPx - 8)}>
            {height < 900 ? "Warm air lid" : "Air mixes freely upward"}
          </text>
          {/* particles */}
          <g className={styles.particles}>
            {points.map((p, i) => (
              <circle
                key={i}
                r={i % 5 === 0 ? 3.2 : 2.2}
                cx={p.u * W}
                cy={0}
                style={{ transform: `translateY(${GROUND - 4 - p.v * (layerPx - 8)}px)` }}
              />
            ))}
          </g>
          <rect y={GROUND} width={W} height="30" fill="var(--slate)" />
        </svg>
        <figcaption className={styles.caption}>
          Illustration: the mixing layer can shrink from over a kilometre on summer afternoons to a few hundred metres
          on winter nights.
        </figcaption>
      </figure>
    </section>
  );
}
