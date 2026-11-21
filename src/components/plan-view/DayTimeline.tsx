import { categorize } from "@/lib/aqi";
import { clockInWindow, formatHour, readingAtClock, type BreathWindow, type HourlyReading } from "@/lib/breathWindow";
import type { RoutineStep } from "@/lib/planner";
import styles from "../PlanView.module.css";

interface Props {
  routine: RoutineStep[];
  cleanWindow: BreathWindow | null;
  /** Hourly forecast, so each step can show the air at its hour. */
  hourly: HourlyReading[];
}

function Step({ step, hourly, cleanWindow }: { step: RoutineStep } & Omit<Props, "routine">) {
  const reading = readingAtClock(hourly, step.time);
  const category = reading ? categorize(reading.aqi) : null;
  const clean = clockInWindow(step.time, cleanWindow);
  return (
    <li data-clean={clean || undefined}>
      <time className={styles.time}>{step.time}</time>
      <span
        className={styles.node}
        aria-hidden="true"
        style={category ? { background: `var(--aqi-${category.level})` } : undefined}
      />
      <div className={styles.stepBody}>
        <p className={styles.stepTitle}>{step.title}</p>
        <p className={styles.stepDetail}>{step.detail}</p>
        {(reading || clean) && (
          <p className={styles.stepMeta}>
            {reading && category && (
              <span className={styles.stepAqi}>
                Forecast AQI {reading.aqi}, {category.label.toLowerCase()}
              </span>
            )}
            {clean && <span className={styles.cleanTag}>In your clean window</span>}
          </p>
        )}
      </div>
    </li>
  );
}

/** The routine on a thread of the day, each step coloured by the forecast AQI at its hour. */
export function DayTimeline({ routine, cleanWindow, hourly }: Props) {
  return (
    <section aria-labelledby="routine-title" className={styles.section}>
      <div className={styles.sectionHead}>
        <h3 id="routine-title">Today, hour by hour</h3>
        {cleanWindow && (
          <p className={styles.lede}>
            {`Built around your cleanest window, ${formatHour(cleanWindow.start)}–${formatHour(cleanWindow.end)}.`}
          </p>
        )}
      </div>
      <ol className={styles.timeline}>
        {routine.map((step) => (
          <Step key={`${step.time}-${step.title}`} step={step} hourly={hourly} cleanWindow={cleanWindow} />
        ))}
      </ol>
    </section>
  );
}
