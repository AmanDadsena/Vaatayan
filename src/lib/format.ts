/** Formats a number for Indian English readers (1,00,000 style grouping), with at most `digits` decimals. */
export function formatNumber(n: number, digits = 0): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: digits });
}
