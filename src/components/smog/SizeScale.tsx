import { useId } from "react";
import styles from "../SmogExplainer.module.css";

/** PM2.5, PM10 and a human hair, drawn to scale. */
export function SizeScale() {
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
          <circle cx="110" cy="110" r={hair / 2} fill="var(--hair)" stroke="var(--smog-stone)" strokeWidth="2" />
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
