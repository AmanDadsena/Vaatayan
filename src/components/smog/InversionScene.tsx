import { useId, useMemo } from "react";
import styles from "../SmogExplainer.module.css";

const W = 640;
const GROUND = 300;
const PARTICLES = 110;
/** Below this mixing height the warm layer above reads as a lid. */
const LID_HEIGHT_M = 900;

const SKYLINE =
  "M0 300v-30h30v-18h20v18h24v-40h14v-14h8v14h14v40h26v-24h34v24h18v-46l14-11 14 11v46h30v-14h24v-18h9v-6h6v6h9v32h38v-20h16v-20h28v40h20v-26h44v26h14v-60h5v-12h3v12h5v60h30v-10h38v-24h17v-14h11v14h17v34h28v-22h46v22h24v-42h30v42h34v-18h24v18h31v-30h18v30z";

/** Deterministic pseudo-random sequence so server and client render the same particles. */
function seeded(n: number) {
  let s = 42;
  const next = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  return Array.from({ length: n }, () => ({ u: next(), v: next() }));
}

interface Props {
  /** Mixing-layer height in metres. */
  height: number;
  /** The same height in SVG pixels. */
  layerPx: number;
  /** Opacity of the smog layer, 0 to 1. */
  density: number;
}

/** A city under the mixing layer: particles fill the layer, and the lid moves with the slider. */
export function InversionScene({ height, layerPx, density }: Props) {
  const id = useId();
  const points = useMemo(() => seeded(PARTICLES), []);
  const lidY = GROUND - layerPx;
  const lidded = height < LID_HEIGHT_M;

  return (
    <svg viewBox={`0 0 ${W} 330`} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--sky-high)" />
          <stop offset="1" stopColor="var(--sky-low)" />
        </linearGradient>
      </defs>
      <rect width={W} height={GROUND} fill={`url(#${id}-sky)`} />
      {/* warm air above the lid */}
      <rect
        className={styles.warm}
        x="0"
        width={W}
        height={Math.max(0, lidY)}
        fill="var(--warm-air)"
        opacity={lidded ? 0.75 : 0.2}
      />
      <path transform={`translate(0 ${GROUND * 0.5}) scale(1 0.5)`} d={SKYLINE} fill="var(--skyline)" />
      {/* mixed layer: drawn over the city so smog engulfs it */}
      <rect
        className={styles.layer}
        x="0"
        y={lidY}
        width={W}
        height={layerPx}
        fill="var(--smog-stone)"
        opacity={density}
      />
      <line className={styles.lid} x1="0" x2={W} y1={lidY} y2={lidY} />
      <text className={styles.lidLabel} x="12" y={Math.max(18, lidY - 8)}>
        {lidded ? "Warm air lid" : "Air mixes freely upward"}
      </text>
      <g className={styles.particles}>
        {points.map((p, i) => (
          <circle
            key={i}
            r={i % 5 === 0 ? 3.2 : 2.2}
            cx={p.u * W}
            cy={0}
            style={{ transform: `translateY(${GROUND - 4 - p.v * (layerPx - 8)}px)` }}
          />
        ))}
      </g>
      <rect y={GROUND} width={W} height="30" fill="var(--slate)" />
    </svg>
  );
}
