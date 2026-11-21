"use client";

import Link from "next/link";
import { useId } from "react";
import { BRAND } from "@/lib/brand";
import { PHOTOS } from "@/lib/photos";
import { SOURCES, AT_RISK } from "@/content/smog";
import { InversionLab } from "./smog/InversionLab";
import { SizeScale } from "./smog/SizeScale";
import { Photo } from "./Photo";
import styles from "./SmogExplainer.module.css";

export function SmogExplainer() {
  const id = useId();
  return (
    <>
      <InversionLab />

      <section className={styles.mornings} aria-labelledby={`${id}-am`}>
        <Photo photo={PHOTOS.smogRoad} caption="New Delhi at 9 am on a winter morning." />
        <div>
          <h2 id={`${id}-am`}>Why mornings are the worst</h2>
          <p>
            Overnight the ground cools, the lid sinks lower, and a whole night of exhaust and fire smoke stays trapped
            near the street. The morning rush adds to it just as the air is at its stillest.
          </p>
          <p>
            By early afternoon the sun warms the ground, the air begins to mix upward, and the smog thins. Then it
            settles back in after sunset. That daily rhythm is why {BRAND.name} looks for your clean-air window instead
            of telling you to stay in all day.
          </p>
          <Link href="/" className={styles.inlineLink}>
            See today&apos;s window for your city
          </Link>
        </div>
      </section>

      <SizeScale />

      <section className={styles.sources} aria-labelledby={`${id}-src`}>
        <div className={styles.sourcesHead}>
          <h2 id={`${id}-src`}>Where winter smog comes from</h2>
          <p>
            Source studies disagree, and the mix changes from day to day, so these are honest ranges rather than one
            neat pie chart.
          </p>
        </div>
        <ul>
          {SOURCES.map((s) => (
            <li key={s.name}>
              <h3>{s.name}</h3>
              <p className={styles.share}>{s.share}</p>
              <p>{s.detail}</p>
              <Link href={s.action.href}>{s.action.text}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.risk} aria-labelledby={`${id}-risk`}>
        <h2 id={`${id}-risk`}>Who needs the most care</h2>
        <dl>
          {AT_RISK.map((r) => (
            <div key={r.who}>
              <dt>{r.who}</dt>
              <dd>{r.why}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.cta}>
          <Link href="/">Get today&apos;s plan for your family</Link>
        </p>
      </section>
    </>
  );
}
