"use client";

import { useId } from "react";
import { usePlaceCombobox } from "@/hooks/usePlaceCombobox";
import type { Place } from "@/lib/schemas";
import { LocateButton } from "./place-search/LocateButton";
import { PlaceOptions } from "./place-search/PlaceOptions";
import styles from "./PlaceSearch.module.css";

/** Accessible place search following the WAI-ARIA 1.2 combobox pattern. */
export function PlaceSearch({ onSelect }: { onSelect: (place: Place) => void }) {
  const id = useId();
  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-opt-${i}`;
  const box = usePlaceCombobox(onSelect);

  return (
    <div className={styles.wrap}>
      <label htmlFor={`${id}-input`} className={styles.label}>
        Where are you breathing today?
      </label>
      <div className={styles.row}>
        <div className={styles.field}>
          <input
            id={`${id}-input`}
            className={styles.input}
            type="text"
            role="combobox"
            aria-expanded={box.expanded}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={box.expanded && box.active >= 0 ? optionId(box.active) : undefined}
            autoComplete="off"
            spellCheck={false}
            maxLength={80}
            placeholder="Search a city or town"
            value={box.query}
            onChange={(e) => box.onQueryChange(e.target.value)}
            onKeyDown={box.onKeyDown}
            onBlur={box.onBlur}
            onFocus={box.onFocus}
          />
          <PlaceOptions
            id={listId}
            optionId={optionId}
            places={box.results}
            active={box.active}
            hidden={!box.expanded}
            onChoose={box.choose}
          />
        </div>
        <LocateButton onLocate={box.choose} onStatus={box.setStatus} />
      </div>
      <p className="visually-hidden" role="status" aria-live="polite">
        {box.status}
      </p>
    </div>
  );
}
