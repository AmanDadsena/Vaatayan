import { BRAND } from "@/lib/brand";
import { hazeDensity } from "@/lib/aqi";
import type { AirSnapshot, Place } from "@/lib/schemas";
import { LiveReading } from "./air-hero/LiveReading";
import { BreathRibbon } from "./BreathRibbon";
import { ErrorNotice } from "./ErrorNotice";
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
  const shortName = place.name.split(",")[0] ?? place.name;

  return (
    <section
      className={styles.hero}
      aria-labelledby="place-heading"
      style={{ "--haze": air ? hazeDensity(air.aqi) : 0 }}
    >
      <div className={styles.sky} aria-hidden="true">
        <div className={styles.haze} />
      </div>

      <div className={`page-wrap ${styles.inner}`}>
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
              {error && <ErrorNotice message={error} onRetry={onRetry} />}
              {!error && !air && <p className={styles.loading}>Reading the air…</p>}
              {air && <LiveReading air={air} />}
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
