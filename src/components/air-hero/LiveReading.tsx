import { categorize, cigarettesPerDay } from "@/lib/aqi";
import { formatHour } from "@/lib/breathWindow";
import type { AirSnapshot } from "@/lib/schemas";
import { AqiScale } from "../AqiScale";
import styles from "../AirHero.module.css";

/** A number with its unit set smaller beside it. */
function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {value}
        <span className={styles.unit}> {unit}</span>
      </dd>
    </div>
  );
}

/** The current air in words and numbers: the verdict, AQI, PM2.5, its cigarette equivalent and PM10. */
export function LiveReading({ air }: { air: AirSnapshot }) {
  const category = categorize(air.aqi);
  return (
    <>
      <p className={styles.verdict}>
        Air is <strong>{category.label.toLowerCase()}</strong> right now. {category.advice}
      </p>
      <dl className={styles.stats}>
        <div className={styles.statMain} data-level={category.level}>
          <dt>US AQI</dt>
          <dd>{air.aqi}</dd>
        </div>
        <Stat label="PM2.5" value={air.pm25} unit="µg/m³" />
        <Stat label="Like smoking" value={cigarettesPerDay(air.pm25)} unit="cigarettes a day" />
        <Stat label="PM10" value={air.pm10} unit="µg/m³" />
      </dl>
      <AqiScale aqi={air.aqi} />
      <p className={styles.updated}>
        Updated {formatHour(air.time)} local time. Forecast from the CAMS atmosphere model.
      </p>
    </>
  );
}
