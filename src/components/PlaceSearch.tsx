"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FriendlyError, searchPlaces } from "@/lib/client";
import type { Place } from "@/lib/schemas";
import styles from "./PlaceSearch.module.css";

interface Props {
  onSelect: (place: Place) => void;
}

const DEBOUNCE_MS = 300;

/** Accessible place search following the WAI-ARIA 1.2 combobox pattern. */
export function PlaceSearch({ onSelect }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState("");
  const [locating, setLocating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const places = await searchPlaces(q, controller.signal);
        setResults(places);
        setActive(-1);
        setOpen(true);
        setStatus(
          places.length ? `${places.length} places found. Use the arrow keys to choose.` : "No places match that name.",
        );
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setResults([]);
        setStatus(error instanceof FriendlyError ? error.message : "Search failed. Try again.");
      }
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  function choose(place: Place) {
    onSelect(place);
    setQuery("");
    setResults([]);
    setOpen(false);
    setStatus(`Showing air for ${place.name}.`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === "Enter" && open && active >= 0) {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  function locateMe() {
    if (!("geolocation" in navigator)) {
      setStatus("Your browser can't share location. Search for your city instead.");
      return;
    }
    setLocating(true);
    setStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        choose({
          name: "Your location",
          latitude: Math.round(pos.coords.latitude * 100) / 100,
          longitude: Math.round(pos.coords.longitude * 100) / 100,
        });
      },
      () => {
        setLocating(false);
        setStatus("Location access was blocked. Search for your city instead.");
      },
      { maximumAge: 600_000, timeout: 10_000 },
    );
  }

  const expanded = open && results.length > 0;

  return (
    <div className={styles.wrap}>
      <label htmlFor={`${id}-input`} className={styles.label}>
        Where are you breathing today?
      </label>
      <div className={styles.row}>
        <div className={styles.field}>
          <input
            ref={inputRef}
            id={`${id}-input`}
            className={styles.input}
            type="text"
            role="combobox"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={expanded && active >= 0 ? `${id}-opt-${active}` : undefined}
            autoComplete="off"
            spellCheck={false}
            maxLength={80}
            placeholder="Search a city or town"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length < 2) {
                setResults([]);
                setStatus("");
              }
            }}
            onKeyDown={onKeyDown}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            onFocus={() => results.length && setOpen(true)}
          />
          <ul id={listId} role="listbox" aria-label="Matching places" className={styles.list} hidden={!expanded}>
            {results.map((place, i) => (
              <li
                key={`${place.latitude},${place.longitude}`}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className={styles.option}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(place)}
              >
                {place.name}
              </li>
            ))}
          </ul>
        </div>
        <button type="button" className={styles.locate} onClick={locateMe} disabled={locating}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
            <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {locating ? "Locating…" : "Use my location"}
        </button>
      </div>
      <p className="visually-hidden" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
