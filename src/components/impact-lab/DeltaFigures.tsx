import { cigarettesAvoided } from "@/lib/impact";
import { formatNumber } from "@/lib/format";
import { type Delta } from "@/lib/simulator";
import styles from "../ImpactLab.module.css";

/** Three before/after figures. Positive = better; negative values are shown as costs. */
export function DeltaFigures({ delta, label }: { delta: Delta; label: string }) {
  const items = [
    {
      key: "lungs",
      value: delta.lungsUgPerDay,
      better: `${formatNumber(delta.lungsUgPerDay)} µg less PM2.5 breathed a day`,
      worse: `${formatNumber(-delta.lungsUgPerDay)} µg more PM2.5 breathed a day`,
      extra:
        delta.lungsUgPerDay > 0
          ? `≈ ${formatNumber(cigarettesAvoided(delta.lungsUgPerDay), 1)} cigarettes' worth`
          : undefined,
    },
    {
      key: "co2",
      value: delta.co2KgPerWeek,
      better: `${formatNumber(delta.co2KgPerWeek, 1)} kg less CO₂ a week`,
      worse: `${formatNumber(-delta.co2KgPerWeek, 1)} kg more CO₂ a week`,
    },
    {
      key: "smog",
      value: delta.smogGPerWeek,
      better: `${formatNumber(delta.smogGPerWeek, 1)} g less smog a week`,
      worse: `${formatNumber(-delta.smogGPerWeek, 1)} g more smog a week`,
    },
  ];
  return (
    <ul className={styles.figures} aria-label={label} aria-live="polite">
      {items.map((i) => {
        const tone = i.value > 0 ? "better" : i.value < 0 ? "worse" : "same";
        return (
          <li key={i.key} data-tone={tone}>
            <span className={styles.figureIcon} aria-hidden="true">
              {tone === "better" ? "↓" : tone === "worse" ? "↑" : "="}
            </span>
            <span>
              {tone === "same" ? "No change" : tone === "better" ? i.better : i.worse}
              {i.extra && <small>{i.extra}</small>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
