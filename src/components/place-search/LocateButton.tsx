"use client";

import { useState } from "react";
import type { Place } from "@/lib/schemas";
import styles from "../PlaceSearch.module.css";

/** Two decimals is about 1 km: enough for air quality, without sharing an exact address. */
const roundCoord = (n: number) => Math.round(n * 100) / 100;

interface Props {
  onLocate: (place: Place) => void;
  onStatus: (status: string) => void;
}

/** Asks the browser for the visitor's position and reports it as a place, or says why it could not. */
export function LocateButton({ onLocate, onStatus }: Props) {
  const [locating, setLocating] = useState(false);

  function locate() {
    if (!("geolocation" in navigator)) {
      onStatus("Your browser can't share location. Search for your city instead.");
      return;
    }
    setLocating(true);
    onStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onLocate({
          name: "Your location",
          latitude: roundCoord(pos.coords.latitude),
          longitude: roundCoord(pos.coords.longitude),
        });
      },
      () => {
        setLocating(false);
        onStatus("Location access was blocked. Search for your city instead.");
      },
      { maximumAge: 600_000, timeout: 10_000 },
    );
  }

  return (
    <button type="button" className={`button-outline ${styles.locate}`} onClick={locate} disabled={locating}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {locating ? "Locating…" : "Use my location"}
    </button>
  );
}
