"use client";

import { useId } from "react";
import styles from "../HomeAir.module.css";

export function DiyFilter() {
  const id = useId();
  return (
    <section className={styles.card} aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`}>Build a box-fan filter for a few thousand rupees</h2>
      <p className={styles.lede}>
        Known as a Corsi–Rosenthal box. In tests it often matches purifiers that cost many times more.
      </p>
      <div className={styles.diy}>
        <figure className={styles.diyFigure}>
          <svg viewBox="0 0 260 240" role="img" aria-labelledby={`${id}-svg`}>
            <title id={`${id}-svg`}>
              A cube of four filters with a box fan on top. Air is pulled in through the filter walls and blown out of
              the top.
            </title>
            {/* inflow arrows */}
            <g className={styles.flowIn} stroke="var(--clear)" strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M8 150h34m-8-7 8 7-8 7" />
              <path d="M252 150h-34m8-7-8 7 8 7" />
            </g>
            {/* filter cube */}
            <g stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round">
              <path d="M52 100 130 76l78 24v104l-78 24-78-24z" fill="var(--paper)" />
              <path d="M130 124v104M52 100l78 24 78-24" fill="none" />
            </g>
            {/* pleats */}
            <g stroke="var(--fog)" strokeWidth="2">
              {[64, 76, 88, 100, 112].map((x, i) => (
                <path key={`l${x}`} d={`M${x} ${104 + i * 3.6}v96`} />
              ))}
              {[148, 160, 172, 184, 196].map((x, i) => (
                <path key={`r${x}`} d={`M${x} ${118 - i * 3.6}v96`} />
              ))}
            </g>
            {/* fan */}
            <path
              d="M52 100 130 76l78 24-78 24z"
              fill="var(--sky)"
              stroke="var(--ink)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <g transform="translate(130 100) scale(1 0.32)">
              <g className={styles.blades} fill="var(--ink)">
                <ellipse cx="0" cy="-30" rx="12" ry="28" />
                <ellipse cx="0" cy="-30" rx="12" ry="28" transform="rotate(120)" />
                <ellipse cx="0" cy="-30" rx="12" ry="28" transform="rotate(240)" />
              </g>
              <circle r="8" fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" />
            </g>
            {/* outflow */}
            <g className={styles.flowOut} stroke="var(--clear)" strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M110 56c-6-12 6-20 0-32M130 52c-6-12 6-20 0-32M150 56c-6-12 6-20 0-32" />
            </g>
          </svg>
        </figure>
        <ol className={styles.steps}>
          <li>
            <strong>Buy four MERV-13 filters</strong> the same size as a 20-inch box fan, and one box fan.
          </li>
          <li>
            <strong>Tape the filters into a cube</strong> with the airflow arrows pointing inward. Cardboard makes the
            base.
          </li>
          <li>
            <strong>Tape the fan on top</strong>, blowing up and out. Seal every gap with tape so air must pass through
            the filters.
          </li>
          <li>
            <strong>Run it on medium in the bedroom</strong> with the door shut. Swap filters when they turn grey, about
            every 3 to 6 months in smog season.
          </li>
        </ol>
      </div>
    </section>
  );
}
