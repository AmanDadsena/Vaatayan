import { categorize } from "@/lib/aqi";
import { formatHour, type HourlyReading } from "@/lib/breathWindow";
import styles from "../BreathRibbon.module.css";

/** The forecast as a table, folded away by default: the accessible, exact version of the chart. */
export function HourlyTable({ hourly }: { hourly: HourlyReading[] }) {
  return (
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
  );
}
