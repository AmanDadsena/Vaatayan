"use client";

import { useEffect, useId, useState } from "react";
import { loadLocal, saveLocal } from "@/lib/client";
import { minutesToClean, requiredCadr } from "@/lib/simulator";
import { PHOTOS } from "@/lib/photos";
import { Photo } from "./Photo";
import { useNumberInput } from "./useNumberInput";
import styles from "./HomeAir.module.css";

/* ---------- Purifier sizing ---------- */

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  unit,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
}) {
  const id = useId();
  const input = useNumberInput(value, onChange, { min, max });
  return (
    <div className={styles.numberField}>
      <label htmlFor={id}>{label}</label>
      <div>
        <input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} {...input} />
        <span aria-hidden="true">{unit}</span>
      </div>
    </div>
  );
}

function PurifierSizer() {
  const id = useId();
  const [length, setLength] = useState(4);
  const [width, setWidth] = useState(3.5);
  const [height, setHeight] = useState(2.8);
  const [owned, setOwned] = useState(250);
  const need = requiredCadr(length, width, height);
  const minutes = minutesToClean(owned, need.volumeM3);
  const enough = owned >= need.cadrM3h;

  return (
    <section className={styles.card} aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`}>What size purifier does a room need?</h2>
      <p className={styles.lede}>
        Aim for about five complete air changes an hour. Check the purifier&apos;s CADR (clean air delivery rate) on the
        box.
      </p>
      <div className={styles.fields}>
        <NumberField label="Length" value={length} onChange={setLength} min={1} max={20} unit="m" />
        <NumberField label="Width" value={width} onChange={setWidth} min={1} max={20} unit="m" />
        <NumberField label="Ceiling height" value={height} onChange={setHeight} min={2} max={6} unit="m" />
      </div>
      <div className={styles.answer} aria-live="polite">
        <p>
          A <strong>{need.volumeM3} m³</strong> room needs a CADR of at least
        </p>
        <p className={styles.bigAnswer}>
          {need.cadrM3h} <span>m³/h</span>
        </p>
        <p className={styles.small}>That&apos;s about {need.cadrCfm} CFM, the unit many boxes use.</p>
      </div>
      <div className={styles.check}>
        <NumberField
          label="Your purifier's CADR"
          value={owned}
          onChange={setOwned}
          min={0}
          max={2000}
          step={10}
          unit="m³/h"
        />
        <p aria-live="polite" data-ok={enough || undefined}>
          {minutes === null
            ? "Enter a CADR above zero."
            : `${enough ? "Big enough." : "Undersized for this room."} With doors and windows shut it removes 80% of particles in about ${minutes} minutes.`}
        </p>
      </div>
    </section>
  );
}

/* ---------- DIY filter illustration ---------- */

function DiyFilter() {
  const id = useId();
  return (
    <section className={styles.card} aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`}>Build a box-fan filter for a few thousand rupees</h2>
      <p className={styles.lede}>
        Known as a Corsi–Rosenthal box. In tests it often matches purifiers that cost many times more.
      </p>
      <div className={styles.diy}>
        <figure className={styles.diyFigure}>
          <svg viewBox="0 0 260 240" role="img" aria-labelledby={`${id}-svg`}>
            <title id={`${id}-svg`}>
              A cube of four filters with a box fan on top. Air is pulled in through the filter walls and blown out of
              the top.
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
        </figure>
        <ol className={styles.steps}>
          <li>
            <strong>Buy four MERV-13 filters</strong> the same size as a 20-inch box fan, and one box fan.
          </li>
          <li>
            <strong>Tape the filters into a cube</strong> with the airflow arrows pointing inward. Cardboard makes the
            base.
          </li>
          <li>
            <strong>Tape the fan on top</strong>, blowing up and out. Seal every gap with tape so air must pass through
            the filters.
          </li>
          <li>
            <strong>Run it on medium in the bedroom</strong> with the door shut. Swap filters when they turn grey, about
            every 3 to 6 months in smog season.
          </li>
        </ol>
      </div>
    </section>
  );
}

/* ---------- Room checklist ---------- */

const ROOMS: { room: string; items: { id: string; text: string }[] }[] = [
  {
    room: "Bedroom",
    items: [
      { id: "bed-purifier", text: "Purifier or box-fan filter running, door shut" },
      { id: "bed-seal", text: "Foam strip on the window frame" },
      { id: "bed-coil", text: "No mosquito coil; a net or plug-in instead" },
    ],
  },
  {
    room: "Kitchen",
    items: [
      { id: "kit-exhaust", text: "Exhaust or chimney on before cooking" },
      { id: "kit-lid", text: "Lids on while frying and tempering" },
      { id: "kit-door", text: "Kitchen door shut while cooking" },
    ],
  },
  {
    room: "Living room",
    items: [
      { id: "liv-mop", text: "Damp-mop the floor instead of sweeping" },
      { id: "liv-incense", text: "Incense or diya only near an open window, briefly" },
      { id: "liv-window", text: "Windows opened only during the clean-air window" },
    ],
  },
  {
    room: "Front door",
    items: [
      { id: "door-snake", text: "Draught stopper under the main door" },
      { id: "door-shoes", text: "Shoes off at the door to keep road dust out" },
      { id: "door-masks", text: "N95 masks kept by the door for everyone" },
    ],
  },
];

const CHECK_KEY = "vaatayan.checklist.v1";
const ALL_IDS = ROOMS.flatMap((r) => r.items.map((i) => i.id));

function RoomChecklist() {
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

/* ---------- Buying guide ---------- */

const BUYING_TIPS = [
  {
    title: "True HEPA (H13 or better)",
    text: 'Captures at least 99.95% of the hardest-to-catch particles. "HEPA-type" or "HEPA-like" is marketing.',
  },
  {
    title: "A stated CADR",
    text: "No CADR on the box means no way to know if it suits your room. Use the sizer above.",
  },
  { title: "No ozone, no ioniser", text: "Skip anything that advertises ozone or relies on ions instead of a filter." },
  {
    title: "Filter cost and noise",
    text: "Check replacement filter prices and noise on the setting you will use overnight.",
  },
];

function BuyingGuide() {
  const id = useId();
  return (
    <section className={styles.guide} aria-labelledby={`${id}-t`}>
      <Photo
        photo={PHOTOS.hepaFilter}
        caption="Left, a carbon pre-filter for odours. Right, the pleated HEPA filter that traps PM2.5."
      />
      <div>
        <h2 id={`${id}-t`}>What to look for in a purifier</h2>
        <dl className={styles.tips}>
          {BUYING_TIPS.map((t) => (
            <div key={t.title}>
              <dt>{t.title}</dt>
              <dd>{t.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ---------- Myths ---------- */

const MYTHS = [
  {
    claim: "Houseplants will clean the air in my room.",
    verdict: "Myth",
    truth:
      "You would need hundreds of plants per square metre to match what normal ventilation does. Grow them for joy, not for PM2.5.",
  },
  {
    claim: "A wet cloth on the window traps the smog.",
    verdict: "Mostly myth",
    truth:
      "It catches some coarse dust, but fine PM2.5 passes around and through it. Sealing gaps and filtering works far better.",
  },
  {
    claim: "A surgical or cloth mask is enough outside.",
    verdict: "Myth",
    truth:
      "Loose masks let most fine particles leak around the edges. Only a well-fitted N95 or FFP2 gives real protection.",
  },
  {
    claim: "Ionisers and 'ozone purifiers' are the strongest cleaners.",
    verdict: "Avoid",
    truth:
      "Ozone irritates the lungs it is supposed to protect. Choose a purifier with a true HEPA filter and a stated CADR.",
  },
  {
    claim: "Staying indoors means I'm breathing clean air.",
    verdict: "Only if you act",
    truth:
      "In a leaky home, indoor PM2.5 is often 60 to 90% of the outdoor level. Indoors gets clean when you seal and filter.",
  },
  {
    claim: "Jaggery or steam clears pollution out of your lungs.",
    verdict: "Myth",
    truth:
      "No food or steam removes particles already deposited in the lungs. Lowering what you breathe in is what helps.",
  },
];

function Myths() {
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

export function HomeAir() {
  return (
    <>
      <div className={styles.twoUp}>
        <PurifierSizer />
        <RoomChecklist />
      </div>
      <BuyingGuide />
      <DiyFilter />
      <Myths />
    </>
  );
}
