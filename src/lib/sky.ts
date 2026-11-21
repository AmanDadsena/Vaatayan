/**
 * Paints the sky for a given AQI: the view through the hero window.
 * Clean air is a clear blue sky with a crisp sun; heavy smog turns it a
 * brownish grey with the dim orange disc familiar from winter mornings.
 */

type Rgb = [number, number, number];

interface SkyStop {
  aqi: number;
  top: Rgb;
  horizon: Rgb;
  sun: Rgb;
  /** Radius of the sun's glow relative to its disc. */
  glow: number;
  /** Visibility of the far skyline, 0–1. */
  skyline: number;
}

const FIRST_STOP: SkyStop = {
  aqi: 0,
  top: [94, 162, 214],
  horizon: [196, 226, 238],
  sun: [255, 236, 170],
  glow: 1.6,
  skyline: 0.85,
};

const STOPS: readonly SkyStop[] = [
  FIRST_STOP,
  { aqi: 100, top: [132, 172, 196], horizon: [212, 222, 214], sun: [252, 222, 140], glow: 2, skyline: 0.65 },
  { aqi: 200, top: [150, 154, 158], horizon: [204, 190, 168], sun: [240, 170, 92], glow: 2.6, skyline: 0.42 },
  { aqi: 300, top: [132, 124, 118], horizon: [190, 164, 132], sun: [226, 136, 70], glow: 3.1, skyline: 0.26 },
  { aqi: 500, top: [104, 94, 88], horizon: [168, 138, 108], sun: [196, 110, 64], glow: 3.6, skyline: 0.12 },
];

export interface SkyPalette {
  top: string;
  horizon: string;
  sun: string;
  glow: number;
  skyline: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const toHex = ([r, g, b]: Rgb) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export function skyFor(aqi: number): SkyPalette {
  const value = Number.isFinite(aqi) ? Math.min(500, Math.max(0, aqi)) : 0;
  // The first stop at or above the value, and the one before it (the first stop for value 0).
  const upper = Math.max(
    STOPS.findIndex((s) => s.aqi >= value),
    0,
  );
  const hi = STOPS[upper] ?? FIRST_STOP;
  const lo = STOPS[upper - 1] ?? hi;
  const t = hi.aqi === lo.aqi ? 0 : (value - lo.aqi) / (hi.aqi - lo.aqi);
  return {
    top: toHex(mix(lo.top, hi.top, t)),
    horizon: toHex(mix(lo.horizon, hi.horizon, t)),
    sun: toHex(mix(lo.sun, hi.sun, t)),
    glow: Math.round(lerp(lo.glow, hi.glow, t) * 100) / 100,
    skyline: Math.round(lerp(lo.skyline, hi.skyline, t) * 100) / 100,
  };
}
