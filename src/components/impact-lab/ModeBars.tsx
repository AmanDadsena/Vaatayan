import { MODES } from "@/lib/impact";
import { COMMUTE_LABELS } from "@/lib/labels";
import { formatNumber } from "@/lib/format";
import { commuteDose, commuteWeekly } from "@/lib/simulator";
import type { CommuteMode } from "@/lib/schemas";
import styles from "../ImpactLab.module.css";

/** Every way to travel, excluding working from home. */
const TRAVEL_MODES = (Object.keys(MODES) as CommuteMode[]).filter((m) => m !== "home");

/** Accessible bar chart: a real table whose cells carry proportional bars. */
export function ModeBars({
  km,
  days,
  pm25,
  from,
  to,
}: {
  km: number;
  days: number;
  pm25: number;
  from: CommuteMode;
  to: CommuteMode;
}) {
  const rows = TRAVEL_MODES.map((mode) => ({
    mode,
    co2: commuteWeekly(mode, km, days).co2KgPerWeek,
    dose: commuteDose(mode, km, pm25),
  }));
  const maxCo2 = Math.max(...rows.map((r) => r.co2), 1);
  const maxDose = Math.max(...rows.map((r) => r.dose), 1);

  return (
    <div className={styles.barsWrap}>
      <table className={styles.bars}>
        <caption>
          Every way to make your {km} km trip, {days} days a week
        </caption>
        <thead>
          <tr>
            <th scope="col">Mode</th>
            <th scope="col">CO₂ a week</th>
            <th scope="col">PM2.5 you breathe a day</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.mode} data-role={r.mode === from ? "from" : r.mode === to ? "to" : undefined}>
              <th scope="row">
                {COMMUTE_LABELS[r.mode]}
                {r.mode === from && <span className={styles.tag}>now</span>}
                {r.mode === to && <span className={styles.tag}>switch</span>}
              </th>
              <td>
                <span className={styles.bar} style={{ "--w": r.co2 / maxCo2 } as React.CSSProperties} data-kind="co2" />
                <span className={styles.barValue}>{formatNumber(r.co2, 1)} kg</span>
              </td>
              <td>
                <span
                  className={styles.bar}
                  style={{ "--w": r.dose / maxDose } as React.CSSProperties}
                  data-kind="dose"
                />
                <span className={styles.barValue}>{formatNumber(r.dose)} µg</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
