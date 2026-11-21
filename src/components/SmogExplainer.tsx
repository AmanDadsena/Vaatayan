"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { categorize, aqiFromPm25 } from "@/lib/aqi";
import { concentrationForMixingHeight } from "@/lib/simulator";
import { BRAND } from "@/lib/brand";
import { PHOTOS } from "@/lib/photos";
import { Photo } from "./Photo";
import styles from "./SmogExplainer.module.css";

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

function InversionLab() {
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
        <div className={styles.range}>
          <label htmlFor={`${id}-h`}>
            Height of the mixing layer <output htmlFor={`${id}-h`}>{height.toLocaleString("en-IN")} m</output>
          </label>
          <input
            id={`${id}-h`}
            type="range"
            min={100}
            max={MAX_H}
            step={50}
            value={height}
            aria-valuetext={`${height} metres, PM2.5 about ${pm} micrograms per cubic metre`}
            onChange={(e) => setHeight(Number(e.target.value))}
          />
        </div>
        <p className={styles.readout} aria-live="polite">
          Same emissions, PM2.5 near the ground: <strong>{pm} µg/m³</strong>
          <span data-level={category.level}>{category.label}</span>
        </p>
      </div>

      <figure className={styles.scene}>
        <svg viewBox={`0 0 ${W} 330`} aria-hidden="true">
          <defs>
            <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#b8d6dc" />
              <stop offset="1" stopColor="#e3eded" />
            </linearGradient>
          </defs>
          <rect width={W} height={GROUND} fill={`url(#${id}-sky)`} />
          {/* warm air above the lid */}
          <rect
            className={styles.warm}
            x="0"
            width={W}
            height={Math.max(0, GROUND - layerPx)}
            fill="#f1d9bf"
            opacity={height < 900 ? 0.75 : 0.2}
          />
          {/* skyline */}
          <path
            transform={`translate(0 ${GROUND * 0.5}) scale(1 0.5)`}
            d="M0 300v-30h30v-18h20v18h24v-40h14v-14h8v14h14v40h26v-24h34v24h18v-46l14-11 14 11v46h30v-14h24v-18h9v-6h6v6h9v32h38v-20h16v-20h28v40h20v-26h44v26h14v-60h5v-12h3v12h5v60h30v-10h38v-24h17v-14h11v14h17v34h28v-22h46v22h24v-42h30v42h34v-18h24v18h31v-30h18v30z"
            fill="#5f7774"
          />
          {/* mixed layer: drawn over the city so smog engulfs it */}
          <rect
            className={styles.layer}
            x="0"
            y={GROUND - layerPx}
            width={W}
            height={layerPx}
            fill="#9c8f7f"
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
          <rect y={GROUND} width={W} height="30" fill="#4a605e" />
        </svg>
        <figcaption className={styles.caption}>
          Illustration: the mixing layer can shrink from over a kilometre on summer afternoons to a few hundred metres
          on winter nights.
        </figcaption>
      </figure>
    </section>
  );
}

function SizeScale() {
  const id = useId();
  // Diameters drawn to scale: hair ≈ 70 µm.
  const hair = 180;
  const pm10 = (hair * 10) / 70;
  const pm25 = (hair * 2.5) / 70;
  return (
    <section className={styles.size} aria-labelledby={`${id}-t`}>
      <div>
        <h2 id={`${id}-t`}>Smaller than you can imagine</h2>
        <p>
          PM2.5 means particles 2.5 micrometres across or smaller, about thirty times thinner than a human hair. They
          slip past the nose and throat, reach deep into the lungs, and the finest pass into the blood.
        </p>
      </div>
      <figure className={styles.sizeFigure}>
        <svg viewBox="0 0 420 220" role="img" aria-labelledby={`${id}-svg`}>
          <title id={`${id}-svg`}>
            Drawn to scale: a human hair 70 micrometres wide, a PM10 particle 10 micrometres, and a PM2.5 particle 2.5
            micrometres.
          </title>
          <circle cx="110" cy="110" r={hair / 2} fill="#e6dccd" stroke="#9c8f7f" strokeWidth="2" />
          <text x="110" y="114" textAnchor="middle" className={styles.sizeLabel}>
            Human hair, 70 µm
          </text>
          <circle className={styles.pop} cx="270" cy="110" r={pm10 / 2} fill="var(--aqi-sensitive)" />
          <text x="270" y="150" textAnchor="middle" className={styles.sizeLabel}>
            PM10
          </text>
          <circle className={styles.pop} cx="350" cy="110" r={pm25 / 2} fill="var(--aqi-very-unhealthy)" />
          <text x="350" y="150" textAnchor="middle" className={styles.sizeLabel}>
            PM2.5
          </text>
        </svg>
      </figure>
    </section>
  );
}

const SOURCES = [
  {
    name: "Vehicles",
    share: "About a fifth to a quarter of winter PM2.5 in Delhi's best-known study",
    detail: "Exhaust plus brake, tyre and road dust, released right at breathing height.",
    action: { href: "/impact", text: "Compare your commute" },
  },
  {
    name: "Crop-residue fires",
    share: "Near zero on some days, a large share on peak days in late October and November",
    detail: "Estimates swing with the wind. Scientists still debate its overall share against local sources.",
    action: { href: "/impact", text: "See what you can change" },
  },
  {
    name: "Burning at home and on the street",
    share: "Rises every winter",
    detail: "Wood and coal for heat, rubbish and leaf fires, and solid-fuel cooking.",
    action: { href: "/home-air", text: "Make home cleaner" },
  },
  {
    name: "Dust from roads and building sites",
    share: "Mostly coarse PM10, with a real slice of PM2.5",
    detail: "Lifted by traffic and wind, then settles into homes.",
    action: { href: "/home-air", text: "Keep dust out" },
  },
  {
    name: "Industry and power plants",
    share: "A steady background share",
    detail: "Including coal power that runs the electric heaters many of us switch to.",
    action: { href: "/impact", text: "Weigh heating options" },
  },
];

const AT_RISK = [
  { who: "Children", why: "They breathe more air for their size, and their lungs are still growing." },
  { who: "Older adults", why: "Fine particles raise the risk of heart attack and stroke." },
  { who: "Pregnant women", why: "Exposure is linked to low birth weight and early birth." },
  { who: "People with asthma, COPD or heart disease", why: "Smog days often bring flare-ups." },
  { who: "Outdoor workers", why: "Traffic police, vendors and delivery riders breathe it all day." },
];

export function SmogExplainer() {
  const id = useId();
  return (
    <>
      <InversionLab />

      <section className={styles.mornings} aria-labelledby={`${id}-am`}>
        <Photo photo={PHOTOS.smogRoad} caption="New Delhi at 9 am on a winter morning." />
        <div>
          <h2 id={`${id}-am`}>Why mornings are the worst</h2>
          <p>
            Overnight the ground cools, the lid sinks lower, and a whole night of exhaust and fire smoke stays trapped
            near the street. The morning rush adds to it just as the air is at its stillest.
          </p>
          <p>
            By early afternoon the sun warms the ground, the air begins to mix upward, and the smog thins. Then it
            settles back in after sunset. That daily rhythm is why {BRAND.name} looks for your clean-air window instead
            of telling you to stay in all day.
          </p>
          <Link href="/" className={styles.inlineLink}>
            See today&apos;s window for your city
          </Link>
        </div>
      </section>

      <SizeScale />

      <section className={styles.sources} aria-labelledby={`${id}-src`}>
        <div className={styles.sourcesHead}>
          <h2 id={`${id}-src`}>Where winter smog comes from</h2>
          <p>
            Source studies disagree, and the mix changes from day to day, so these are honest ranges rather than one
            neat pie chart.
          </p>
        </div>
        <ul>
          {SOURCES.map((s) => (
            <li key={s.name}>
              <h3>{s.name}</h3>
              <p className={styles.share}>{s.share}</p>
              <p>{s.detail}</p>
              <Link href={s.action.href}>{s.action.text}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.risk} aria-labelledby={`${id}-risk`}>
        <h2 id={`${id}-risk`}>Who needs the most care</h2>
        <dl>
          {AT_RISK.map((r) => (
            <div key={r.who}>
              <dt>{r.who}</dt>
              <dd>{r.why}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.cta}>
          <Link href="/">Get today&apos;s plan for your family</Link>
        </p>
      </section>
    </>
  );
}
