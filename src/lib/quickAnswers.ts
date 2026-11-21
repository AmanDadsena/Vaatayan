import { categorize } from "./aqi";
import { formatHour } from "./breathWindow";
import { indoorPm, pmAtHour, type ImpactContext } from "./impact";
import { minutesToClean, requiredCadr } from "./simulator";

/**
 * Built-in answers for common follow-up questions, used when no AI key is
 * configured. Every answer is grounded in the live reading and the same
 * deterministic numbers the rest of the app shows.
 */

export type Topic =
  | "children"
  | "exercise"
  | "purifier"
  | "mask"
  | "ventilation"
  | "plants"
  | "wet-cloth"
  | "cooking"
  | "heating"
  | "symptoms"
  | "general";

interface Rule {
  topic: Exclude<Topic, "general">;
  pattern: RegExp;
}

/** Order matters: the first match wins, so specific topics come before broad ones. */
const RULES: Rule[] = [
  { topic: "symptoms", pattern: /\b(chest pain|can'?t breathe|breathless|wheez|cough|dizzy|faint|asthma attack)/ },
  { topic: "plants", pattern: /\b(plant|plants|money plant|snake plant|tulsi)\b/ },
  { topic: "wet-cloth", pattern: /\b(wet|damp)\b.*\b(cloth|towel|sheet|curtain)s?\b|\b(cloth|towel)s?\b.*\bwindow/ },
  { topic: "purifier", pattern: /\b(purifier|cadr|hepa|filter|cfm)\b/ },
  { topic: "mask", pattern: /\b(mask|n95|ffp2|kn95|respirator)\b/ },
  { topic: "children", pattern: /\b(kid|kids|child|children|son|daughter|baby|school|play|playground|park)\b/ },
  {
    topic: "exercise",
    pattern: /\b(walk|walking|run|running|jog|jogging|exercise|workout|gym|yoga|cycle|cycling|cricket|sport)\b/,
  },
  { topic: "ventilation", pattern: /\b(window|windows|ventilat\w*|air out|open the|fresh air)\b/ },
  { topic: "cooking", pattern: /\b(cook|cooking|kitchen|stove|chulha|tadka|fry|frying|chimney)\b/ },
  { topic: "heating", pattern: /\b(heater|heaters|heating|angithi|bonfire|fireplace|keep warm)\b/ },
];

export function detectTopic(question: string): Topic {
  const q = question.toLowerCase();
  return RULES.find((r) => r.pattern.test(q))?.topic ?? "general";
}

/** Reads a room size like "12 m²", "12 sq m", "12m2" or "120 sq ft" (converted to m²). */
export function parseRoomArea(question: string): number | null {
  const q = question.toLowerCase();
  const metric = q.match(/(\d+(?:\.\d+)?)\s*(?:m²|m2|sq\.?\s*m\b|sqm|square met)/);
  if (metric?.[1]) return Number.parseFloat(metric[1]);
  const imperial = q.match(/(\d+(?:\.\d+)?)\s*(?:sq\.?\s*ft|sqft|square f(?:ee|oo)t|ft²)/);
  if (imperial?.[1]) return Math.round(Number.parseFloat(imperial[1]) * 0.0929 * 10) / 10;
  return null;
}

function windowPhrase(ctx: ImpactContext): string {
  if (!ctx.clean) return "There is no clearly cleaner stretch in waking hours today.";
  return `The cleanest stretch today is ${formatHour(ctx.clean.start)}–${formatHour(ctx.clean.end)}, at about AQI ${ctx.clean.averageAqi}.`;
}

/** What every answer may draw on, worked out once per question. */
interface Facts {
  question: string;
  ctx: ImpactContext;
  /** "Right now the air is … (US AQI …)." */
  rightNow: string;
  /** Sentence describing today's cleanest window. */
  window: string;
  /** True when even the cleanest window is above AQI 150. */
  noSafeWindow: boolean;
}

function purifierAnswer(question: string): string {
  const area = parseRoomArea(question);
  if (!area) {
    return "Aim for about five air changes an hour: multiply the room's floor area by its height and by 5 to get the CADR you need in m³/h. A 12 m² bedroom needs around 170 m³/h. Choose true HEPA (H13), and run it with the door shut. The Home air page has a calculator.";
  }
  const side = Math.sqrt(area);
  const need = requiredCadr(side, side, 2.8);
  const minutes = minutesToClean(need.cadrM3h, need.volumeM3);
  return `For about ${area} m² with a normal 2.8 m ceiling, look for a CADR of at least ${need.cadrM3h} m³/h (about ${need.cadrCfm} CFM). At that rate it removes 80% of particles in roughly ${minutes} minutes with the door shut. Choose true HEPA (H13) and avoid ionisers or ozone.`;
}

/** One answer per topic. Typed as a Record so a new topic cannot ship without an answer. */
const ANSWERS: Record<Topic, (f: Facts) => string> = {
  symptoms: () =>
    "If someone has chest pain, severe breathlessness, blue lips or confusion, get medical help now. " +
    "For milder coughing or wheezing, move them into the cleanest room, keep the purifier on, and follow their doctor's asthma or heart plan.",

  children: (f) =>
    f.noSafeWindow
      ? `${f.rightNow} Even the best window today is above AQI 150, so keep play indoors. ${f.window} Children breathe more air for their size than adults, so a calm indoor game beats a run in the park today.`
      : `${f.rightNow} ${f.window} Short outdoor play inside that window is reasonable; keep it gentle and come in if anyone starts coughing.`,

  exercise: (f) =>
    f.noSafeWindow
      ? `${f.rightNow} ${f.window} That is still too high for hard exercise, which multiplies how much air you breathe. Do yoga or strength work indoors with windows shut instead.`
      : `${f.rightNow} ${f.window} Move your workout into that window rather than the early morning, when PM2.5 is forecast near ${Math.round(pmAtHour(f.ctx.air, 7))} µg/m³. Keep the pace easy if AQI is above 100.`,

  purifier: (f) => purifierAnswer(f.question),

  mask: (f) =>
    `${f.rightNow} Only a well-fitted N95 or FFP2 helps against PM2.5; cloth and surgical masks leak around the edges. Press the nose clip, check for air leaking at the sides, and replace it once it gets damp or hard to breathe through. A good fit can cut what you breathe outdoors by around 80%.`,

  ventilation: (f) =>
    `${f.window} Open windows wide for 15 minutes in that window to clear stale air, then close up again. Keep them shut through the early morning and after sunset, when smog settles close to the ground.`,

  plants: () =>
    "That one is a myth. You would need hundreds of plants per square metre to match even normal ventilation, so plants don't meaningfully lower PM2.5. Grow them because you enjoy them, and use sealing and filtration for clean air.",

  "wet-cloth": () =>
    "It helps less than people hope. A wet cloth catches some coarse dust, but fine PM2.5 passes around and through it. Sealing gaps with foam strips and running a filter in the room you sleep in works far better.",

  cooking: (f) =>
    f.ctx.household.cookingFuel === "biomass"
      ? "Solid-fuel smoke is the biggest indoor source in many homes, often hundreds of µg/m³. Moving daily items like tea and rice to LPG or induction makes the largest difference, and any remaining wood or dung cooking is safer outdoors and downwind."
      : "Switch on the chimney or exhaust before you start and leave it on for 10 minutes after. Keep lids on while frying and tempering, and shut the kitchen door so the burst of particles doesn't spread through the house.",

  heating: (f) =>
    f.ctx.household.heating === "wood-coal" || f.ctx.household.heating === "kerosene"
      ? "Burning wood, coal or kerosene indoors fills the room with fine particles and fumes. Heat one closed room with an electric heater instead, and layer up: thermal innerwear and a warm cap hold heat well. Never sleep with an angithi burning in a closed room."
      : "Heat one closed room rather than the whole house, keep doors shut, and layer up. That keeps both your bill and the grid's emissions down.",

  general: (f) =>
    `${f.rightNow} ${f.window} Indoors in a typical home it is probably around ${Math.round(indoorPm(f.ctx))} µg/m³ of PM2.5, so sealing gaps and filtering the bedroom help most. I can answer quick questions about children playing outside, exercise timing, masks, purifier size, opening windows, cooking and heating.`,
};

export function quickAnswer(question: string, ctx: ImpactContext): { topic: Topic; text: string } {
  const topic = detectTopic(question);
  const aqi = ctx.air.aqi;
  const facts: Facts = {
    question,
    ctx,
    rightNow: `Right now the air is ${categorize(aqi).label.toLowerCase()} (US AQI ${aqi}).`,
    window: windowPhrase(ctx),
    noSafeWindow: (ctx.clean?.averageAqi ?? aqi) > 150,
  };
  return { topic, text: ANSWERS[topic](facts) };
}
