import { useId } from "react";
import { categorize, hazeDensity } from "@/lib/aqi";
import { skyFor } from "@/lib/sky";
import styles from "./HeroWindow.module.css";

interface Props {
  aqi: number | null;
  place: string;
}

const OPENING = "M40 400V172C40 112 84 78 119 54c18-12 27-24 31-44 4 20 13 32 31 44 35 24 79 58 79 118v228z";
const OUTER = "M26 404V170C26 104 74 66 112 41c20-13 31-26 38-41 7 15 18 28 38 41 38 25 86 63 86 129v234z";
const SKYLINE =
  "M40 400v-58h14v-16h10v-12h6v12h10v26h18v-34h8l6-10 6 10h8v46h16v-22h22v-18h6v-10h4v10h6v40h14v-30h12v-16h18v46h10v-26h16v-12h4v12h10v34h14v-20h20v-14h8v34h10v60z";

/** Deterministic particle positions so server and client render identically. */
const PARTICLES = Array.from({ length: 48 }, (_, i) => {
  const x = 48 + ((i * 97) % 205);
  const y = 70 + ((i * 53) % 300);
  const r = 1.2 + ((i * 7) % 5) * 0.35;
  return { x, y, r, delay: (i % 8) * -0.9 };
});

/** A jharokha window painted with the live sky: the brand idea made visible. */
export function HeroWindow({ aqi, place }: Props) {
  const id = useId().replace(/:/g, "");
  const value = aqi ?? 40;
  const sky = skyFor(value);
  const haze = hazeDensity(value);
  const visible = aqi === null ? 0 : Math.min(PARTICLES.length, Math.round(value / 9));
  const label =
    aqi === null
      ? "A window onto the sky, waiting for live air data."
      : `Illustration of the sky over ${place} at US AQI ${aqi}, ${categorize(aqi).label.toLowerCase()}: ${
          aqi > 150
            ? "a hazy, brownish sky with a dim orange sun"
            : aqi > 50
              ? "a pale, slightly hazy sky"
              : "a clear blue sky with a bright sun"
        }.`;

  return (
    <figure className={styles.figure}>
      <svg className={styles.svg} viewBox="0 0 300 420" role="img" aria-label={label}>
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sky.top} />
            <stop offset="1" stopColor={sky.horizon} />
          </linearGradient>
          <radialGradient id={`${id}-glow`}>
            <stop offset="0" stopColor={sky.sun} stopOpacity="0.85" />
            <stop offset="1" stopColor={sky.sun} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-haze`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sky.horizon} stopOpacity="0" />
            <stop offset="1" stopColor={sky.horizon} stopOpacity="0.95" />
          </linearGradient>
          <clipPath id={`${id}-clip`}>
            <path d={OPENING} />
          </clipPath>
        </defs>

        {/* Outer carved frame */}
        <path d={OUTER} className={styles.outer} />

        <g clipPath={`url(#${id}-clip)`}>
          <rect className={styles.paint} width="300" height="420" fill={`url(#${id}-sky)`} />
          <circle className={styles.paint} cx="196" cy="150" r={22 * sky.glow} fill={`url(#${id}-glow)`} />
          <circle className={styles.paint} cx="196" cy="150" r="22" fill={sky.sun} />
          <path d={SKYLINE} fill="#4d5f5c" opacity={sky.skyline} className={styles.paint} />
          <rect
            className={`${styles.paint} ${styles.hazeBand}`}
            x="-60"
            y={300 - haze * 220}
            width="420"
            height={140 + haze * 220}
            fill={`url(#${id}-haze)`}
            opacity={0.35 + haze * 0.6}
          />
          <g className={styles.particles} fill="#4a3f35">
            {PARTICLES.slice(0, visible).map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={p.r} style={{ animationDelay: `${p.delay}s` }} />
            ))}
          </g>
        </g>

        {/* Frame and balcony rail */}
        <path d={OPENING} className={styles.frame} />
        <g className={styles.rail}>
          <rect x="24" y="370" width="252" height="9" rx="4.5" />
          <rect x="18" y="406" width="264" height="14" rx="4" />
          {Array.from({ length: 11 }, (_, i) => (
            <rect key={i} x={45 + i * 21} y="379" width="4" height="27" rx="2" />
          ))}
        </g>
      </svg>
      <figcaption className={styles.caption}>The view from your window, painted from live data</figcaption>
    </figure>
  );
}
