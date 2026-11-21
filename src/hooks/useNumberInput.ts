"use client";

import { useState, type ChangeEvent } from "react";

interface Options {
  min: number;
  max: number;
  integer?: boolean;
}

/**
 * Props for a controlled number input that people can actually edit: the
 * field may be cleared or hold a half-typed value while focused, and only
 * in-range numbers are committed. On blur it snaps back to the committed value.
 */
export function useNumberInput(value: number, onChange: (n: number) => void, { min, max, integer = false }: Options) {
  const [draft, setDraft] = useState(String(value));
  const [synced, setSynced] = useState(value);

  // Follow outside changes (e.g. +/− buttons) without an effect.
  if (value !== synced) {
    setSynced(value);
    setDraft(String(value));
  }

  const parse = (text: string) => (integer ? Number.parseInt(text, 10) : Number.parseFloat(text));

  return {
    value: draft,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const text = event.target.value;
      setDraft(text);
      const n = parse(text);
      if (Number.isFinite(n) && n >= min && n <= max && n !== value) {
        setSynced(n);
        onChange(n);
      }
    },
    onBlur: () => setDraft(String(value)),
  };
}
