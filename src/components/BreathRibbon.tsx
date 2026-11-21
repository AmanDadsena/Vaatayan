import { categorize } from "@/lib/aqi";
import { findCleanestWindow, findWorstWindow, formatHour, type HourlyReading } from "@/lib/breathWindow";
import styles from "./BreathRibbon.module.css";

interface Props {
  hourly: HourlyReading[];
}

const SCALE_MAX = 400;

function inWindow(time: string, w: { start: string; end: string } | null) {
  return w !== null && time >= w.start && time < w.end;
}

/** 24-hour forecast strip that brackets the cleanest and worst hours of the day. */
export function BreathRibbon({ hourly }: Props) {
  if (hourly.length === 0) return null;
  const clean = findCleanestWindow(hourly);
  const worst = findWorstWindow(hourly);

  const summary = [
    clean
      ? `Cleanest time to be outside: ${formatHour(clean.start)} to ${formatHour(clean.end)}, average AQI ${clean.averageAqi}.`
      : "No clearly cleaner window during waking hours.",
    worst ? `Worst: ${formatHour(worst.start)} to ${formatHour(worst.end)}, average AQI ${worst.averageAqi}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

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

      <div className={styles.chart} aria-hidden="true">
        {hourly.map((r, i) => {
          const cat = categorize(r.aqi);
          const isClean = inWindow(r.time, clean);
          const isWorst = inWindow(r.time, worst);
          return (
            <div
              key={r.time}
              className={styles.col}
              data-clean={isClean || undefined}
              data-worst={isWorst || undefined}
              data-now={i === 0 || undefined}
              title={`${formatHour(r.time)}: AQI ${r.aqi}, ${cat.label}`}
            >
              {i === 0 && <span className={styles.now}>Now</span>}
              <div
                className={styles.bar}
                style={{
                  height: `${Math.max(6, (Math.min(r.aqi, SCALE_MAX) / SCALE_MAX) * 100)}%`,
                  background: `var(--aqi-${cat.level})`,
                }}
              />
              <span className={styles.tick}>
                {Number.parseInt(r.time.slice(11, 13), 10) % 3 === 0 ? formatHour(r.time) : ""}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.legend} aria-hidden="true">
        <span className={styles.legendClean}>Cleanest 2 hours</span>
        <span className={styles.legendWorst}>Worst 2 hours</span>
      </div>

      <p className="visually-hidden">{summary}</p>

      <details className={styles.details}>
        <summary>Hour-by-hour numbers</summary>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="visually-hidden">Forecast US AQI and PM2.5 by hour</caption>
            <thead>
              <tr>
                <th scope="col">Hour</th>
                <th scope="col">US AQI</th>
                <th scope="col">PM2.5 (µg/m³)</th>
                <th scope="col">Category</th>
              </tr>
            </thead>
            <tbody>
              {hourly.map((r) => (
                <tr key={r.time}>
                  <th scope="row">{formatHour(r.time)}</th>
                  <td>{r.aqi}</td>
                  <td>{r.pm25}</td>
                  <td>{categorize(r.aqi).label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
