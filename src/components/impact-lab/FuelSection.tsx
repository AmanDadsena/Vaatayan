"use client";

import { useId } from "react";
import { COOKING_LABELS, HEATING_LABELS } from "@/lib/labels";
import { COOKING, HEATING, type Delta } from "@/lib/simulator";
import { ChoicePills } from "../ChoicePills";
import styles from "../ImpactLab.module.css";
import { DeltaFigures } from "./DeltaFigures";
import type { SectionProps } from "./settings";

/** Compares the home's heating and cooking fuels with cleaner ones. */
export function FuelSection({ settings, update, delta }: SectionProps & { delta: Delta }) {
  const id = useId();
  const { heatFrom, heatTo, cookFrom, cookTo, people } = settings;

  return (
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
        <div className={`panel ${styles.result}`}>
          <p className={styles.resultLead}>For a home of {people}:</p>
          <DeltaFigures delta={delta} label="Heating and cooking change" />
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
  );
}
