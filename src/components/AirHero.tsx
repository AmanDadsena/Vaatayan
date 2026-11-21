import { categorize, cigarettesPerDay, hazeDensity } from "@/lib/aqi";
import type { AirSnapshot, Place } from "@/lib/schemas";
import { BreathRibbon } from "./BreathRibbon";
import { PlaceSearch } from "./PlaceSearch";
import { SiteHeader } from "./SiteHeader";
import { BRAND } from "@/lib/brand";
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
  const shortName = place.name.split(",")[0];

  return (
    <section className={styles.hero} aria-labelledby="place-heading" style={{ "--haze": haze } as React.CSSProperties}>
      <div className={styles.sky} aria-hidden="true">
        <svg className={styles.skyline} viewBox="0 0 1200 160" preserveAspectRatio="none">
          <path d="M0 160V118h40V96h26v22h30V70h18V52h10v18h18v48h34V88h44v30h22V60l18-14 18 14v58h40V100h30V78h12v-8h8v8h12v40h50V92h20V66h36v52h26V84h56v34h18V40h6V24h4v16h6v78h40V104h48V74h22V56h14v18h22v44h36V90h60v28h30V64h40v54h44V96h30v22h40V80h24v38h50V102h36v58z" />
        </svg>
        <div className={styles.haze} />
      </div>

      <div className={styles.inner}>
        <SiteHeader />
        <p className={styles.tagline} title={BRAND.meaning}>
          {BRAND.tagline}
        </p>

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
            </>
          )}
        </div>

        {air && <BreathRibbon hourly={air.hourly} />}
      </div>
    </section>
  );
}
