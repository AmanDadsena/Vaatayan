import { AQI_CATEGORIES, categorize } from "@/lib/aqi";
import styles from "./AqiScale.module.css";

const SCALE_MAX = 500;
const BOUNDS = [0, 50, 100, 150, 200, 300, 500];

/** Where a value sits on the 0–500 scale, as a percentage. */
export function scalePosition(aqi: number): number {
  return Math.round((Math.min(SCALE_MAX, Math.max(0, aqi)) / SCALE_MAX) * 1000) / 10;
}

/** The six AQI bands with a marker for the current reading, so a number gains context. */
export function AqiScale({ aqi }: { aqi: number }) {
  const category = categorize(aqi);
  const position = scalePosition(aqi);
  return (
    <div className={styles.scale} role="img" aria-label={`US AQI ${aqi} on a scale of 0 to 500: ${category.label}.`}>
      <div className={styles.track} aria-hidden="true">
        {AQI_CATEGORIES.map((c, i) => (
          <span
            key={c.level}
            className={styles.band}
            data-current={c.level === category.level || undefined}
            style={{ flexGrow: BOUNDS[i + 1] - BOUNDS[i], background: `var(--aqi-${c.level})` }}
          />
        ))}
        <span className={styles.marker} style={{ left: `${position}%` }} />
      </div>
      <div className={styles.labels} aria-hidden="true">
        <span>Good</span>
        <span>Unhealthy</span>
        <span>Hazardous</span>
      </div>
    </div>
  );
}
