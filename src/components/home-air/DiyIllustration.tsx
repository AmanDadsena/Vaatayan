import styles from "../HomeAir.module.css";

/** A Corsi–Rosenthal box: four filters in a cube, a fan on top, air drawn in through the walls. */
export function DiyIllustration({ titleId }: { titleId: string }) {
  return (
    <svg viewBox="0 0 260 240" role="img" aria-labelledby={titleId}>
      <title id={titleId}>
        A cube of four filters with a box fan on top. Air is pulled in through the filter walls and blown out of the
        top.
      </title>
      {/* inflow arrows */}
      <g className={styles.flowIn} stroke="var(--clear)" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M8 150h34m-8-7 8 7-8 7" />
        <path d="M252 150h-34m8-7-8 7 8 7" />
      </g>
      {/* filter cube */}
      <g stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round">
        <path d="M52 100 130 76l78 24v104l-78 24-78-24z" fill="var(--paper)" />
        <path d="M130 124v104M52 100l78 24 78-24" fill="none" />
      </g>
      {/* pleats */}
      <g stroke="var(--fog)" strokeWidth="2">
        {[64, 76, 88, 100, 112].map((x, i) => (
          <path key={`l${x}`} d={`M${x} ${104 + i * 3.6}v96`} />
        ))}
        {[148, 160, 172, 184, 196].map((x, i) => (
          <path key={`r${x}`} d={`M${x} ${118 - i * 3.6}v96`} />
        ))}
      </g>
      {/* fan */}
      <path
        d="M52 100 130 76l78 24-78 24z"
        fill="var(--sky)"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <g transform="translate(130 100) scale(1 0.32)">
        <g className={styles.blades} fill="var(--ink)">
          <ellipse cx="0" cy="-30" rx="12" ry="28" />
          <ellipse cx="0" cy="-30" rx="12" ry="28" transform="rotate(120)" />
          <ellipse cx="0" cy="-30" rx="12" ry="28" transform="rotate(240)" />
        </g>
        <circle r="8" fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" />
      </g>
      {/* outflow */}
      <g className={styles.flowOut} stroke="var(--clear)" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M110 56c-6-12 6-20 0-32M130 52c-6-12 6-20 0-32M150 56c-6-12 6-20 0-32" />
      </g>
    </svg>
  );
}
