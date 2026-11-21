/** What a key press in the combobox should do. */
type ComboAction =
  { type: "move"; index: number } | { type: "choose"; index: number } | { type: "close" } | { type: "none" };

/**
 * The WAI-ARIA combobox keys: arrows move through the options and wrap,
 * Enter picks the highlighted one while the list is open, Escape closes it.
 */
export function comboKey(key: string, active: number, count: number, open: boolean): ComboAction {
  if (key === "ArrowDown" && count) return { type: "move", index: (active + 1) % count };
  if (key === "ArrowUp" && count) return { type: "move", index: active <= 0 ? count - 1 : active - 1 };
  if (key === "Enter" && open && active >= 0 && active < count) return { type: "choose", index: active };
  if (key === "Escape") return { type: "close" };
  return { type: "none" };
}
