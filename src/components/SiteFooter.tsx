import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { NAV_LINKS } from "@/lib/nav";
import { LogoMark } from "./LogoMark";
import styles from "./SiteFooter.module.css";

/** Site footer: what the name means, navigation, the data source and a medical disclaimer. */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`page-wrap ${styles.inner}`}>
        <div className={styles.brand}>
          <LogoMark size={56} />
          <p className={styles.meaning}>
            <span lang="hi" className={styles.native}>
              {BRAND.nativeName}
            </span>
            <span>{BRAND.meaning}</span>
          </p>
        </div>

        <nav aria-label="Footer" className={styles.nav}>
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.fine}>
          <p>
            Live air quality and forecasts from{" "}
            <a href="https://open-meteo.com/en/docs/air-quality-api" rel="noopener noreferrer" target="_blank">
              Open-Meteo<span className="visually-hidden"> (opens in a new tab)</span>
            </a>{" "}
            (CAMS models), refreshed hourly. Impact figures are estimates for comparing choices.
          </p>
          <p>General guidance, not medical advice. If you have trouble breathing or chest pain, seek medical care.</p>
        </div>
      </div>
    </footer>
  );
}
