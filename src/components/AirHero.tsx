import { BRAND } from "@/lib/brand";
import { categorize, cigarettesPerDay, hazeDensity } from "@/lib/aqi";
import type { AirSnapshot, Place } from "@/lib/schemas";
import { formatHour } from "@/lib/breathWindow";
import { AqiScale } from "./AqiScale";
import { BreathRibbon } from "./BreathRibbon";
import { HeroWindow } from "./HeroWindow";
import { PlaceSearch } from "./PlaceSearch";
import { SiteHeader } from "./SiteHeader";
import styles from "./AirHero.module.css";

interface Props {
  place: Place;
  air: AirSnapshot | null;
  loading: boolean;
  error: string | null;
  onSelectPlace: (place: Place) => void;
  onRetry: () => void;
}

/** Hero band: the sky over the chosen place, hazed to match the live AQI. */
export function AirHero({ place, air, loading, error, onSelectPlace, onRetry }: Props) {
  const category = air ? categorize(air.aqi) : null;
  const haze = air ? hazeDensity(air.aqi) : 0;
  const shortName = place.name.split(",")[0] ?? place.name;

  return (
    <section className={styles.hero} aria-labelledby="place-heading" style={{ "--haze": haze }}>
      <div className={styles.sky} aria-hidden="true">
        <div className={styles.haze} />
      </div>

      <div className={styles.inner}>
        <SiteHeader />
        <p className={styles.tagline} title={BRAND.meaning}>
          {BRAND.tagline}
        </p>

        <div className={styles.stage}>
          <div className={styles.left}>
            <PlaceSearch onSelect={onSelectPlace} />

            <div className={styles.reading} aria-live="polite" aria-busy={loading}>
              <h1 id="place-heading" className={styles.place}>
                {shortName}
              </h1>

              {error && (
                <div className={styles.error} role="alert">
                  <p>{error}</p>
                  <button type="button" onClick={onRetry} className={styles.retry}>
                    Try again
                  </button>
                </div>
              )}

              {!error && !air && <p className={styles.loading}>Reading the air…</p>}

              {air && category && (
                <>
                  <p className={styles.verdict}>
                    Air is <strong>{category.label.toLowerCase()}</strong> right now. {category.advice}
                  </p>
                  <dl className={styles.stats}>
                    <div className={styles.statMain} data-level={category.level}>
                      <dt>US AQI</dt>
                      <dd>{air.aqi}</dd>
                    </div>
                    <div>
                      <dt>PM2.5</dt>
                      <dd>
                        {air.pm25}
                        <span className={styles.unit}> µg/m³</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Like smoking</dt>
                      <dd>
                        {cigarettesPerDay(air.pm25)}
                        <span className={styles.unit}> cigarettes a day</span>
                      </dd>
                    </div>
                    <div>
                      <dt>PM10</dt>
                      <dd>
                        {air.pm10}
                        <span className={styles.unit}> µg/m³</span>
                      </dd>
                    </div>
                  </dl>
                  <AqiScale aqi={air.aqi} />
                  <p className={styles.updated}>
                    Updated {formatHour(air.time)} local time. Forecast from the CAMS atmosphere model.
                  </p>
                </>
              )}
            </div>
          </div>
          <HeroWindow aqi={air?.aqi ?? null} place={shortName} />
        </div>

        {air && (
          <div className={styles.ribbonPanel}>
            <BreathRibbon hourly={air.hourly} />
          </div>
        )}
      </div>
    </section>
  );
}
