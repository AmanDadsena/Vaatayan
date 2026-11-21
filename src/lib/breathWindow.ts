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
    const first = slice[0];
    if (!first) continue;
    const startHour = hourOf(first.time);
    const endHour = startHour + hours;
    const contiguous = slice.every((r, j) => j === 0 || hourOf(r.time) === (startHour + j) % 24);
    if (!contiguous || startHour < wakeHour || endHour > sleepHour) continue;

    const candidate: BreathWindow = {
      start: first.time,
      end: addHours(first.time, hours),
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

/** Hour of day from a "HH:MM" clock string, or NaN if malformed. */
function clockHour(clock: string): number {
  return /^\d{2}:\d{2}$/.test(clock) ? Number.parseInt(clock.slice(0, 2), 10) : Number.NaN;
}

/**
 * The forecast reading for the next occurrence of a clock time ("HH:MM").
 * Readings start at the current hour and cover 24 hours, so each hour of the
 * day appears once: an hour earlier than now refers to tomorrow.
 */
export function readingAtClock(readings: HourlyReading[], clock: string): HourlyReading | null {
  const hour = clockHour(clock);
  if (Number.isNaN(hour)) return null;
  return readings.find((r) => hourOf(r.time) === hour) ?? null;
}

/** Whether a clock time falls inside a window's hours. */
export function clockInWindow(clock: string, window: { start: string; end: string } | null): boolean {
  const hour = clockHour(clock);
  if (!window || Number.isNaN(hour)) return false;
  const start = hourOf(window.start);
  const end = start + Math.round((Date.parse(`${window.end}:00Z`) - Date.parse(`${window.start}:00Z`)) / 3_600_000);
  return (hour >= start && hour < end) || hour + 24 < end;
}
