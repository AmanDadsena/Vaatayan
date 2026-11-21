import { categorize } from "@/lib/aqi";
import { formatHour, type HourlyReading } from "@/lib/breathWindow";
import styles from "../BreathRibbon.module.css";

/** Bars are drawn against this AQI; anything above it is shown full height. */
const SCALE_MAX = 400;
/** Bars never shrink below this percentage, so clean hours stay visible. */
const MIN_BAR_PCT = 6;

type Span = { start: string; end: string } | null;

const inSpan = (time: string, span: Span) => span !== null && time >= span.start && time < span.end;
const barHeight = (aqi: number) => `${Math.max(MIN_BAR_PCT, (Math.min(aqi, SCALE_MAX) / SCALE_MAX) * 100)}%`;
/** Label every third hour so the axis stays readable on a phone. */
const tickFor = (time: string) => (Number.parseInt(time.slice(11, 13), 10) % 3 === 0 ? formatHour(time) : "");

/** One bar per forecast hour, coloured by AQI band, with the cleanest and worst spans marked. */
export function RibbonChart({ hourly, clean, worst }: { hourly: HourlyReading[]; clean: Span; worst: Span }) {
  return (
    <div className={styles.chart} aria-hidden="true">
      {hourly.map((r, i) => {
        const cat = categorize(r.aqi);
        return (
          <div
            key={r.time}
            className={styles.col}
            data-clean={inSpan(r.time, clean) || undefined}
            data-worst={inSpan(r.time, worst) || undefined}
            data-now={i === 0 || undefined}
            title={`${formatHour(r.time)}: AQI ${r.aqi}, ${cat.label}`}
          >
            {i === 0 && <span className={styles.now}>Now</span>}
            <div className={styles.bar} style={{ height: barHeight(r.aqi), background: `var(--aqi-${cat.level})` }} />
            <span className={styles.tick}>{tickFor(r.time)}</span>
          </div>
        );
      })}
    </div>
  );
}
