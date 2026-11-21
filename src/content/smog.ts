/** Copy for the Why winter smog page, kept apart from the components that render it. */

export const SOURCES = [
  {
    name: "Vehicles",
    share: "About a fifth to a quarter of winter PM2.5 in Delhi's best-known study",
    detail: "Exhaust plus brake, tyre and road dust, released right at breathing height.",
    action: { href: "/impact", text: "Compare your commute" },
  },
  {
    name: "Crop-residue fires",
    share: "Near zero on some days, a large share on peak days in late October and November",
    detail: "Estimates swing with the wind. Scientists still debate its overall share against local sources.",
    action: { href: "/impact", text: "See what you can change" },
  },
  {
    name: "Burning at home and on the street",
    share: "Rises every winter",
    detail: "Wood and coal for heat, rubbish and leaf fires, and solid-fuel cooking.",
    action: { href: "/home-air", text: "Make home cleaner" },
  },
  {
    name: "Dust from roads and building sites",
    share: "Mostly coarse PM10, with a real slice of PM2.5",
    detail: "Lifted by traffic and wind, then settles into homes.",
    action: { href: "/home-air", text: "Keep dust out" },
  },
  {
    name: "Industry and power plants",
    share: "A steady background share",
    detail: "Including coal power that runs the electric heaters many of us switch to.",
    action: { href: "/impact", text: "Weigh heating options" },
  },
];

export const AT_RISK = [
  { who: "Children", why: "They breathe more air for their size, and their lungs are still growing." },
  { who: "Older adults", why: "Fine particles raise the risk of heart attack and stroke." },
  { who: "Pregnant women", why: "Exposure is linked to low birth weight and early birth." },
  { who: "People with asthma, COPD or heart disease", why: "Smog days often bring flare-ups." },
  { who: "Outdoor workers", why: "Traffic police, vendors and delivery riders breathe it all day." },
];
