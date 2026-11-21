import { formatNumber } from "@/lib/format";
import type { ActionKind } from "@/lib/impact";
import type { PlanItem } from "@/lib/planner";
import styles from "../PlanView.module.css";

const KIND_ORDER: readonly ActionKind[] = ["routine", "indoor", "swap"];

const KIND_HEADINGS: Record<ActionKind, { title: string; lede: string }> = {
  routine: { title: "Your day", lede: "Small timing changes that cut what you breathe." },
  indoor: { title: "Indoor air", lede: "Make home the cleanest air you breathe all day." },
  swap: { title: "Lower-emission swaps", lede: "Choices that leave less smog for everyone." },
};

function ImpactChips({ item }: { item: PlanItem }) {
  const { lungsUgPerDay, co2KgPerWeek, smogGPerWeek } = item.impact;
  const chips = [
    { key: "lungs", show: lungsUgPerDay > 0, text: `${formatNumber(lungsUgPerDay)} µg less PM2.5 breathed a day` },
    { key: "co2", show: co2KgPerWeek > 0, text: `${formatNumber(co2KgPerWeek, 1)} kg CO₂ saved a week` },
    { key: "smog", show: smogGPerWeek > 0, text: `${formatNumber(smogGPerWeek, 1)} g less smog a week` },
  ].filter((c) => c.show);
  if (chips.length === 0) return null;
  return (
    <ul className={styles.chips} aria-label="Estimated impact">
      {chips.map((c) => (
        <li key={c.key} data-kind={c.key}>
          {c.text}
        </li>
      ))}
    </ul>
  );
}

function ActionCard({ item, checked, onToggle }: { item: PlanItem; checked: boolean; onToggle: () => void }) {
  return (
    <li className={styles.item} data-off={!checked || undefined}>
      <div className={styles.itemHead}>
        <h4 id={`item-${item.id}`}>{item.title}</h4>
        <label className={styles.commit}>
          <input type="checkbox" checked={checked} onChange={onToggle} aria-describedby={`item-${item.id}`} />
          <span>I&apos;ll do this</span>
        </label>
      </div>
      <p>{item.why}</p>
      <ol className={styles.steps}>
        {item.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <ImpactChips item={item} />
      <details className={styles.basis}>
        <summary>How we worked this out</summary>
        <p>{item.impact.basis}</p>
      </details>
    </li>
  );
}

interface Props {
  items: PlanItem[];
  committed: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

/** The plan's actions, grouped by kind, each with a commitment checkbox and its computed impact. */
export function ActionGroups({ items, committed, onToggle }: Props) {
  const groups = KIND_ORDER.map((kind) => ({ kind, items: items.filter((i) => i.kind === kind) })).filter(
    (g) => g.items.length > 0,
  );
  return (
    <>
      {groups.map((group) => (
        <section key={group.kind} aria-labelledby={`group-${group.kind}`} className={styles.section}>
          <div className={styles.sectionHead}>
            <h3 id={`group-${group.kind}`}>{KIND_HEADINGS[group.kind].title}</h3>
            <p className={styles.lede}>{KIND_HEADINGS[group.kind].lede}</p>
          </div>
          <ul className={styles.items}>
            {group.items.map((item) => (
              <ActionCard
                key={item.id}
                item={item}
                checked={committed.has(item.id)}
                onToggle={() => onToggle(item.id)}
              />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
