"use client";

import { useId } from "react";
import { MYTHS } from "@/content/homeAir";
import styles from "../HomeAir.module.css";

export function Myths() {
  const id = useId();
  return (
    <section className={styles.mythSection} aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`}>What actually works</h2>
      <ul className={styles.myths}>
        {MYTHS.map((m) => (
          <li key={m.claim}>
            <details>
              <summary>
                <span className={styles.claim}>{m.claim}</span>
                <span
                  className={styles.verdict}
                  data-verdict={m.verdict === "Myth" || m.verdict === "Avoid" ? "myth" : "nuance"}
                >
                  {m.verdict}
                </span>
              </summary>
              <p>{m.truth}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
