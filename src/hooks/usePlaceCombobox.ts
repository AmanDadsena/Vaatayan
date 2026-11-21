"use client";

import { useState, type KeyboardEvent } from "react";
import { comboKey } from "@/lib/combobox";
import type { Place } from "@/lib/schemas";
import { MIN_QUERY, usePlaceResults } from "./usePlaceResults";

/** How long the list stays after the input loses focus, so a click on an option still lands. */
const BLUR_CLOSE_MS = 150;

/**
 * State for the place combobox: the query, the results, which option is
 * highlighted, and the handlers that tie keyboard, pointer and focus together.
 */
export function usePlaceCombobox(onSelect: (place: Place) => void) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { results, status, setStatus, clear } = usePlaceResults(query, () => {
    setActive(-1);
    setOpen(true);
  });

  function choose(place: Place) {
    onSelect(place);
    setQuery("");
    clear();
    setOpen(false);
    setStatus(`Showing air for ${place.name}.`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const action = comboKey(event.key, active, results.length, open);
    if (action.type === "none") return;
    if (action.type === "close") {
      setOpen(false);
      setActive(-1);
      return;
    }
    event.preventDefault();
    const place = results[action.index];
    if (action.type === "choose" && place) choose(place);
    else {
      setOpen(true);
      setActive(action.index);
    }
  }

  function onQueryChange(next: string) {
    setQuery(next);
    if (next.trim().length < MIN_QUERY) clear();
  }

  return {
    query,
    results,
    active,
    status,
    setStatus,
    expanded: open && results.length > 0,
    choose,
    onKeyDown,
    onQueryChange,
    onBlur: () => window.setTimeout(() => setOpen(false), BLUR_CLOSE_MS),
    onFocus: () => setOpen(results.length > 0),
  };
}
