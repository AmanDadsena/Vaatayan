import { findCleanestWindow, findWorstWindow, formatHour, type HourlyReading } from "@/lib/breathWindow";
import { HourlyTable } from "./breath-ribbon/HourlyTable";
import { RibbonChart } from "./breath-ribbon/RibbonChart";
import styles from "./BreathRibbon.module.css";

type BreathWindow = ReturnType<typeof findCleanestWindow>;

/** The chart in one or two sentences, for screen readers. */
function describe(clean: BreathWindow, worst: BreathWindow): string {
  const best = clean
    ? `Cleanest time to be outside: ${formatHour(clean.start)} to ${formatHour(clean.end)}, average AQI ${clean.averageAqi}.`
    : "No clearly cleaner window during waking hours.";
  const bad = worst
    ? ` Worst: ${formatHour(worst.start)} to ${formatHour(worst.end)}, average AQI ${worst.averageAqi}.`
    : "";
  return best + bad;
}

/** 24-hour forecast strip that brackets the cleanest and worst hours of the day. */
export function BreathRibbon({ hourly }: { hourly: HourlyReading[] }) {
  if (hourly.length === 0) return null;
  const clean = findCleanestWindow(hourly);
  const worst = findWorstWindow(hourly);

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>
        <span className={styles.captionTitle}>Next 24 hours</span>
        {clean && (
          <span className={styles.cleanNote}>
            Best time outside{" "}
            <strong>
              {formatHour(clean.start)}–{formatHour(clean.end)}
            </strong>
          </span>
        )}
      </figcaption>

      <RibbonChart hourly={hourly} clean={clean} worst={worst} />

      <div className={styles.legend} aria-hidden="true">
        <span className={styles.legendClean}>Cleanest 2 hours</span>
        <span className={styles.legendWorst}>Worst 2 hours</span>
      </div>

      <p className="visually-hidden">{describe(clean, worst)}</p>

      <HourlyTable hourly={hourly} />
    </figure>
  );
}
