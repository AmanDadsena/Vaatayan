import styles from "./EmptyPlan.module.css";

const FEATURES = [
  {
    title: "An hour-by-hour routine",
    text: "Built around today's cleanest air, for everyone in your home.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    title: "Indoor air fixes",
    text: "Make home the cleanest air you breathe all day.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11 12 4l8 7v9H4z" />
        <path d="M9 20v-5h6v5" />
      </svg>
    ),
  },
  {
    title: "Lower-emission swaps",
    text: "Each one with how much smog and carbon it saves.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" />
        <path d="M5 19 13 11" />
      </svg>
    ),
  },
];

/** Placeholder for the plan column: a sketch of the day and what the plan will hold. */
export function EmptyPlan() {
  return (
    <div className={styles.empty}>
      <svg className={styles.arc} viewBox="0 0 520 170" aria-hidden="true">
        <defs>
          <linearGradient id="empty-arc" x1="0" x2="1">
            <stop offset="0" stopColor="var(--aqi-very-unhealthy)" />
            <stop offset="0.5" stopColor="var(--clear)" />
            <stop offset="1" stopColor="var(--aqi-very-unhealthy)" />
          </linearGradient>
        </defs>
        <line x1="10" y1="140" x2="510" y2="140" className={styles.horizon} />
        <path d="M40 140C120 20 400 20 480 140" className={styles.path} stroke="url(#empty-arc)" />
        <rect x="220" y="28" width="80" height="112" rx="6" className={styles.window} />
        <circle cx="260" cy="48" r="14" className={styles.sun} />
        <circle cx="88" cy="94" r="8" className={styles.hazySun} />
        <circle cx="432" cy="94" r="8" className={styles.hazySun} />
        <text x="88" y="162" textAnchor="middle">Hazy morning</text>
        <text x="260" y="162" textAnchor="middle" className={styles.strong}>
          Your clean window
        </text>
        <text x="432" y="162" textAnchor="middle">Smoggy evening</text>
      </svg>

      <div className={styles.copy}>
        <h2>Your plan for today appears here</h2>
        <p>Tell us a little about your household and you&apos;ll get:</p>
      </div>

      <ul className={styles.features}>
        {FEATURES.map((f) => (
          <li key={f.title}>
            <span className={styles.icon}>{f.icon}</span>
            <span>
              <strong>{f.title}</strong>
              <span className={styles.text}>{f.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
