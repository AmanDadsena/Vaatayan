"use client";

import { useId } from "react";
import styles from "../HomeAir.module.css";
import { DiyIllustration } from "./DiyIllustration";

/** Step-by-step guide to a home-made box-fan purifier. */
export function DiyFilter() {
  const id = useId();
  return (
    <section className="panel" aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`}>Build a box-fan filter for a few thousand rupees</h2>
      <p className={styles.lede}>
        Known as a Corsi–Rosenthal box. In tests it often matches purifiers that cost many times more.
      </p>
      <div className={styles.diy}>
        <figure className={styles.diyFigure}>
          <DiyIllustration titleId={`${id}-svg`} />
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
