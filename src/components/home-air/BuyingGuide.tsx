"use client";

import { useId } from "react";
import { PHOTOS } from "@/lib/photos";
import { Photo } from "../Photo";
import { BUYING_TIPS } from "@/content/homeAir";
import styles from "../HomeAir.module.css";

/** What to check before buying a purifier: true HEPA, a stated CADR, no ozone, and filter cost and noise. */
export function BuyingGuide() {
  const id = useId();
  return (
    <section className={styles.guide} aria-labelledby={`${id}-t`}>
      <Photo
        photo={PHOTOS.hepaFilter}
        caption="Left, a carbon pre-filter for odours. Right, the pleated HEPA filter that traps PM2.5."
      />
      <div>
        <h2 id={`${id}-t`}>What to look for in a purifier</h2>
        <dl className={styles.tips}>
          {BUYING_TIPS.map((t) => (
            <div key={t.title}>
              <dt>{t.title}</dt>
              <dd>{t.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
