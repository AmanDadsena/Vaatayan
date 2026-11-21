"use client";

import { useEffect, useId, useState } from "react";
import { loadLocal, saveLocal } from "@/lib/client";
import { ROOMS } from "@/content/homeAir";
import styles from "../HomeAir.module.css";

const CHECK_KEY = "vaatayan.checklist.v1";
const ALL_IDS = ROOMS.flatMap((r) => r.items.map((i) => i.id));

export function RoomChecklist() {
  const id = useId();
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    const saved = loadLocal(CHECK_KEY, (v) =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && ALL_IDS.includes(x)) : null,
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
    if (saved) setDone(saved);
  }, []);

  const toggle = (itemId: string) =>
    setDone((prev) => {
      const next = prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId];
      saveLocal(CHECK_KEY, next);
      return next;
    });

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
