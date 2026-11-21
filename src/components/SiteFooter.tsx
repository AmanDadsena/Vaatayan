import { BRAND } from "@/lib/brand";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <p className={styles.meaning}>
        <span lang="hi">{BRAND.nativeName}</span> {BRAND.meaning}
      </p>
      <p>
        Live air quality and forecasts from{" "}
        <a href="https://open-meteo.com/en/docs/air-quality-api" rel="noopener noreferrer" target="_blank">
          Open-Meteo<span className="visually-hidden"> (opens in a new tab)</span>
        </a>{" "}
        (CAMS models), refreshed hourly. Impact figures are estimates for comparing choices.
      </p>
      <p>General guidance, not medical advice. If you have trouble breathing or chest pain, seek medical care.</p>
    </footer>
  );
}
