export interface HourlyReading {
  /** Local ISO time without offset, e.g. "2026-11-21T14:00". */
  time: string;
  aqi: number;
  pm25: number;
}

export interface BreathWindow {
  start: string;
  /** Exclusive end time (start of the hour after the window). */
  end: string;
  averageAqi: number;
  averagePm25: number;
}

export interface WindowOptions {
  /** Length of the window in hours. */
  hours?: number;
  /** Earliest local hour a window may start (inclusive). */
  wakeHour?: number;
  /** Latest local hour a window may end (inclusive). */
  sleepHour?: number;
}

function hourOf(time: string): number {
  return Number.parseInt(time.slice(11, 13), 10);
}

function addHours(time: string, hours: number): string {
  // Times are local wall-clock strings; do arithmetic in UTC to avoid DST/offset drift.
  const date = new Date(`${time}:00Z`);
  date.setUTCHours(date.getUTCHours() + hours);
  return date.toISOString().slice(0, 16);
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Sliding-window search over the forecast. Returns the cleanest (lowest mean
 * AQI) or dirtiest contiguous window that fits inside waking hours, or null
 * when no window fits. Ties go to the earliest window. O(n·k) with tiny k.
 */
function findWindow(
  readings: HourlyReading[],
  pick: "cleanest" | "worst",
  { hours = 2, wakeHour = 6, sleepHour = 22 }: WindowOptions = {},
): BreathWindow | null {
  if (hours < 1 || readings.length < hours) return null;

  let best: BreathWindow | null = null;
  for (let i = 0; i + hours <= readings.length; i++) {
    const slice = readings.slice(i, i + hours);
    const startHour = hourOf(slice[0].time);
    const endHour = startHour + hours;
    const contiguous = slice.every((r, j) => j === 0 || hourOf(r.time) === (startHour + j) % 24);
    if (!contiguous || startHour < wakeHour || endHour > sleepHour) continue;

    const candidate: BreathWindow = {
      start: slice[0].time,
      end: addHours(slice[0].time, hours),
      averageAqi: Math.round(average(slice.map((r) => r.aqi))),
      averagePm25: Math.round(average(slice.map((r) => r.pm25)) * 10) / 10,
    };
    const better =
      best === null ||
      (pick === "cleanest" ? candidate.averageAqi < best.averageAqi : candidate.averageAqi > best.averageAqi);
    if (better) best = candidate;
  }
  return best;
}

export function findCleanestWindow(readings: HourlyReading[], options?: WindowOptions) {
  return findWindow(readings, "cleanest", options);
}

export function findWorstWindow(readings: HourlyReading[], options?: WindowOptions) {
  return findWindow(readings, "worst", options);
}

/** "2026-11-21T14:00" -> "2 pm" (locale-independent so server and client agree). */
export function formatHour(time: string): string {
  const h = hourOf(time);
  if (h === 0) return "12 am";
  if (h === 12) return "12 pm";
  return h < 12 ? `${h} am` : `${h - 12} pm`;
}
