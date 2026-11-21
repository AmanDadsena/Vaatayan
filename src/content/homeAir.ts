/** Copy for the Home air page, kept apart from the components that render it. */

export const ROOMS: { room: string; items: { id: string; text: string }[] }[] = [
  {
    room: "Bedroom",
    items: [
      { id: "bed-purifier", text: "Purifier or box-fan filter running, door shut" },
      { id: "bed-seal", text: "Foam strip on the window frame" },
      { id: "bed-coil", text: "No mosquito coil; a net or plug-in instead" },
    ],
  },
  {
    room: "Kitchen",
    items: [
      { id: "kit-exhaust", text: "Exhaust or chimney on before cooking" },
      { id: "kit-lid", text: "Lids on while frying and tempering" },
      { id: "kit-door", text: "Kitchen door shut while cooking" },
    ],
  },
  {
    room: "Living room",
    items: [
      { id: "liv-mop", text: "Damp-mop the floor instead of sweeping" },
      { id: "liv-incense", text: "Incense or diya only near an open window, briefly" },
      { id: "liv-window", text: "Windows opened only during the clean-air window" },
    ],
  },
  {
    room: "Front door",
    items: [
      { id: "door-snake", text: "Draught stopper under the main door" },
      { id: "door-shoes", text: "Shoes off at the door to keep road dust out" },
      { id: "door-masks", text: "N95 masks kept by the door for everyone" },
    ],
  },
];

export const BUYING_TIPS = [
  {
    title: "True HEPA (H13 or better)",
    text: 'Captures at least 99.95% of the hardest-to-catch particles. "HEPA-type" or "HEPA-like" is marketing.',
  },
  {
    title: "A stated CADR",
    text: "No CADR on the box means no way to know if it suits your room. Use the sizer above.",
  },
  { title: "No ozone, no ioniser", text: "Skip anything that advertises ozone or relies on ions instead of a filter." },
  {
    title: "Filter cost and noise",
    text: "Check replacement filter prices and noise on the setting you will use overnight.",
  },
];

export const MYTHS = [
  {
    claim: "Houseplants will clean the air in my room.",
    verdict: "Myth",
    truth:
      "You would need hundreds of plants per square metre to match what normal ventilation does. Grow them for joy, not for PM2.5.",
  },
  {
    claim: "A wet cloth on the window traps the smog.",
    verdict: "Mostly myth",
    truth:
      "It catches some coarse dust, but fine PM2.5 passes around and through it. Sealing gaps and filtering works far better.",
  },
  {
    claim: "A surgical or cloth mask is enough outside.",
    verdict: "Myth",
    truth:
      "Loose masks let most fine particles leak around the edges. Only a well-fitted N95 or FFP2 gives real protection.",
  },
  {
    claim: "Ionisers and 'ozone purifiers' are the strongest cleaners.",
    verdict: "Avoid",
    truth:
      "Ozone irritates the lungs it is supposed to protect. Choose a purifier with a true HEPA filter and a stated CADR.",
  },
  {
    claim: "Staying indoors means I'm breathing clean air.",
    verdict: "Only if you act",
    truth:
      "In a leaky home, indoor PM2.5 is often 60 to 90% of the outdoor level. Indoors gets clean when you seal and filter.",
  },
  {
    claim: "Jaggery or steam clears pollution out of your lungs.",
    verdict: "Myth",
    truth:
      "No food or steam removes particles already deposited in the lungs. Lowering what you breathe in is what helps.",
  },
];
