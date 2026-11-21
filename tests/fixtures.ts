import type { AirSnapshot, Household, Place } from "@/lib/schemas";
import { DEFAULT_HOUSEHOLD } from "@/lib/schemas";

export const PLACE: Place = { name: "New Delhi, Delhi, India", latitude: 28.61, longitude: 77.21 };

/** A realistic Delhi winter day: dirty night and morning, cleaner early afternoon. */
const PM_BY_HOUR = [
  70, 82, 118, 140, 160, 170, 180, 185, 188, 190, 192, 189, 185, 182, 187, 230, 250, 160, 110, 90, 70, 60, 58, 62,
];

export function makeAir(overrides: Partial<AirSnapshot> = {}): AirSnapshot {
  const hourly = PM_BY_HOUR.map((pm25, i) => {
    const hour = (15 + i) % 24;
    const day = 15 + i < 24 ? 21 : 22;
    return { time: `2026-11-${day}T${String(hour).padStart(2, "0")}:00`, aqi: Math.round(pm25 * 1.5 + 50), pm25 };
  });
  return {
    time: "2026-11-21T15:30",
    timezone: "Asia/Kolkata",
    aqi: 211,
    pm25: 70,
    pm10: 75,
    no2: 40,
    ozone: 160,
    hourly,
    ...overrides,
  };
}

export function makeHousehold(overrides: Partial<Household> = {}): Household {
  return { ...DEFAULT_HOUSEHOLD, ...overrides };
}
