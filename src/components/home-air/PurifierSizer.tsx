"use client";

import { useId, useState } from "react";
import { minutesToClean, requiredCadr } from "@/lib/simulator";
import { NumberField } from "./NumberField";
import styles from "../HomeAir.module.css";

export function PurifierSizer() {
  const id = useId();
  const [length, setLength] = useState(4);
  const [width, setWidth] = useState(3.5);
  const [height, setHeight] = useState(2.8);
  const [owned, setOwned] = useState(250);
  const need = requiredCadr(length, width, height);
  const minutes = minutesToClean(owned, need.volumeM3);
  const enough = owned >= need.cadrM3h;

  return (
    <section className={styles.card} aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`}>What size purifier does a room need?</h2>
      <p className={styles.lede}>
        Aim for about five complete air changes an hour. Check the purifier&apos;s CADR (clean air delivery rate) on the
        box.
      </p>
      <div className={styles.fields}>
        <NumberField label="Length" value={length} onChange={setLength} min={1} max={20} unit="m" />
        <NumberField label="Width" value={width} onChange={setWidth} min={1} max={20} unit="m" />
        <NumberField label="Ceiling height" value={height} onChange={setHeight} min={2} max={6} unit="m" />
      </div>
      <div className={styles.answer} aria-live="polite">
        <p>
          A <strong>{need.volumeM3} m³</strong> room needs a CADR of at least
        </p>
        <p className={styles.bigAnswer}>
          {need.cadrM3h} <span>m³/h</span>
        </p>
        <p className={styles.small}>That&apos;s about {need.cadrCfm} CFM, the unit many boxes use.</p>
      </div>
      <div className={styles.check}>
        <NumberField
          label="Your purifier's CADR"
          value={owned}
          onChange={setOwned}
          min={0}
          max={2000}
          step={10}
          unit="m³/h"
        />
        <p aria-live="polite" data-ok={enough || undefined}>
          {minutes === null
            ? "Enter a CADR above zero."
            : `${enough ? "Big enough." : "Undersized for this room."} With doors and windows shut it removes 80% of particles in about ${minutes} minutes.`}
        </p>
      </div>
    </section>
  );
}
