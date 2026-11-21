"use client";

import { useId } from "react";
import { ROOMS } from "@/content/homeAir";
import { STORAGE_KEYS } from "@/lib/domain";
import { useStoredState } from "../useStoredState";
import styles from "../HomeAir.module.css";

const ALL_IDS = ROOMS.flatMap((r) => r.items.map((i) => i.id));
const NONE_DONE: readonly string[] = [];

/** Keeps only ids that still exist, so renamed or removed checklist items are dropped quietly. */
function readChecklist(value: unknown): string[] | null {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string" && ALL_IDS.includes(x)) : null;
}

export function RoomChecklist() {
  const id = useId();
  const [done, setDone] = useStoredState<readonly string[]>(STORAGE_KEYS.checklist, readChecklist, NONE_DONE);

  const toggle = (itemId: string) =>
    setDone((prev) => (prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId]));

  const pct = Math.round((done.length / ALL_IDS.length) * 100);

  return (
    <section className={styles.card} aria-labelledby={`${id}-t`}>
      <div className={styles.checkHead}>
        <h2 id={`${id}-t`}>Room by room</h2>
        <p aria-live="polite">
          {done.length} of {ALL_IDS.length} done
        </p>
      </div>
      <div
        className={styles.progress}
        role="progressbar"
        aria-label="Home checklist progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.rooms}>
        {ROOMS.map((room) => (
          <fieldset key={room.room} className={styles.room}>
            <legend>{room.room}</legend>
            {room.items.map((item) => (
              <label key={item.id} className={styles.checkItem}>
                <input type="checkbox" checked={done.includes(item.id)} onChange={() => toggle(item.id)} />
                <span>{item.text}</span>
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </section>
  );
}
