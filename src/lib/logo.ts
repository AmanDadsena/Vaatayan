/**
 * The Vaatayan mark: a jharokha (arched window) with clear sky, a sun,
 * and two streams of air flowing in. One source for every place the mark appears.
 */
export const LOGO = {
  viewBox: "0 0 64 64",
  colors: {
    badge: "#142b2a",
    frame: "#9fc4c6",
    opening: "#e6f2f1",
    sun: "#e9b44c",
    windLight: "#7fd1bd",
    windDeep: "#2fa38f",
  },
  frame: "M17 54V31c0-7 4.5-11.5 10-15.5 3-2.2 4.4-4.6 5-8.5.6 3.9 2 6.3 5 8.5 5.5 4 10 8.5 10 15.5v23z",
  opening: "M21.5 54V32c0-5.2 3.4-8.8 7.6-11.9 1.3-1 2.3-2 2.9-3.2.6 1.2 1.6 2.2 2.9 3.2 4.2 3.1 7.6 6.7 7.6 11.9v22z",
  windUpper: "M5 37h24c4.4 0 6.6-4.8 3.2-7.5",
  windLower: "M10 45.5h29.5c4.4 0 6.6 4.8 3.2 7.5",
} as const;

/** Standalone SVG markup, used for generated images (touch icon, social card). */
export function logoSvg(size: number): string {
  const c = LOGO.colors;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${LOGO.viewBox}">
<rect width="64" height="64" rx="16" fill="${c.badge}"/>
<path d="${LOGO.frame}" fill="${c.frame}"/>
<path d="${LOGO.opening}" fill="${c.opening}"/>
<circle cx="36.5" cy="28" r="4.2" fill="${c.sun}"/>
<path d="${LOGO.windUpper}" fill="none" stroke="${c.windLight}" stroke-width="3.6" stroke-linecap="round"/>
<path d="${LOGO.windLower}" fill="none" stroke="${c.windDeep}" stroke-width="3.6" stroke-linecap="round"/>
<rect x="13" y="52.5" width="38" height="4" rx="2" fill="${c.frame}"/>
</svg>`;
}

export const logoDataUri = (size: number) =>
  `data:image/svg+xml;base64,${Buffer.from(logoSvg(size)).toString("base64")}`;
