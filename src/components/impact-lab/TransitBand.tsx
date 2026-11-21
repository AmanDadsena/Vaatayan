import { useId } from "react";
import { PHOTOS } from "@/lib/photos";
import { Photo } from "../Photo";
import styles from "../ImpactLab.module.css";

/** Why shared transit lowers both emissions and the rider's own exposure. */
export function TransitBand() {
  const id = useId();
  return (
    <section className={styles.band} aria-labelledby={`${id}-transit`}>
      <Photo photo={PHOTOS.metro} caption="Delhi Metro, red line." />
      <div>
        <h2 id={`${id}-transit`}>Why shared transit wins twice</h2>
        <p>
          Per passenger-kilometre, a metro trip emits roughly a tenth of the CO₂ of driving alone, and almost none of
          the tailpipe and brake dust that hangs at street level.
        </p>
        <p>
          It protects you too: closed, filtered carriages typically expose riders to less PM2.5 than open two-wheelers,
          autos or walking beside traffic. Pair the last stretch with an N95 and you cut both sides of the problem.
        </p>
      </div>
    </section>
  );
}
