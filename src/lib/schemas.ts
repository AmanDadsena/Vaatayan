import { z } from "zod";

/* ---------- Household profile (user input) ---------- */

export const COMMUTE_MODES = ["car", "two-wheeler", "auto", "bus", "metro", "walk-cycle", "home"] as const;
export const COOKING_FUELS = ["lpg", "electric", "biomass"] as const;
export const HEATING_SOURCES = ["none", "electric", "gas", "wood-coal", "kerosene"] as const;
export const EXERCISE_TIMES = ["none", "morning", "evening"] as const;
export const CONDITIONS = ["asthma-copd", "heart", "pregnancy"] as const;

export type CommuteMode = (typeof COMMUTE_MODES)[number];
export type CookingFuel = (typeof COOKING_FUELS)[number];
export type HeatingSource = (typeof HEATING_SOURCES)[number];
export type ExerciseTime = (typeof EXERCISE_TIMES)[number];
export type Condition = (typeof CONDITIONS)[number];

/** Strip control characters and collapse whitespace in free text. */
const cleanText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) =>
      s
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );

export const householdSchema = z.object({
  adults: z.number().int().min(1).max(12),
  children: z.number().int().min(0).max(12),
  elders: z.number().int().min(0).max(12),
  conditions: z.array(z.enum(CONDITIONS)).max(CONDITIONS.length),
  commuteMode: z.enum(COMMUTE_MODES),
  commuteKm: z.number().min(0).max(150),
  hasPurifier: z.boolean(),
  cookingFuel: z.enum(COOKING_FUELS),
  heating: z.enum(HEATING_SOURCES),
  exercise: z.enum(EXERCISE_TIMES),
  notes: cleanText(280).default(""),
});

export type Household = z.infer<typeof householdSchema>;

export const DEFAULT_HOUSEHOLD: Household = {
  adults: 2,
  children: 1,
  elders: 1,
  conditions: [],
  commuteMode: "car",
  commuteKm: 12,
  hasPurifier: false,
  cookingFuel: "lpg",
  heating: "electric",
  exercise: "morning",
  notes: "",
};

/* ---------- Air quality snapshot (from our /api/air) ---------- */

export const locationSchema = z.object({
  name: cleanText(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type Place = z.infer<typeof locationSchema>;

export const hourlySchema = z.object({
  time: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  aqi: z.number().min(0).max(1000),
  pm25: z.number().min(0).max(2000),
});

export const airSnapshotSchema = z.object({
  time: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  timezone: z.string().max(64),
  aqi: z.number().min(0).max(1000),
  pm25: z.number().min(0).max(2000),
  pm10: z.number().min(0).max(5000),
  no2: z.number().min(0).max(2000),
  ozone: z.number().min(0).max(2000),
  hourly: z.array(hourlySchema).max(48),
});

export type AirSnapshot = z.infer<typeof airSnapshotSchema>;

/* ---------- API request bodies ---------- */

export const planRequestSchema = z.object({
  place: locationSchema,
  air: airSnapshotSchema,
  household: householdSchema,
});

export type PlanRequest = z.infer<typeof planRequestSchema>;

export const askRequestSchema = z.object({
  place: locationSchema,
  air: airSnapshotSchema,
  household: householdSchema,
  question: cleanText(400).pipe(z.string().min(3, "Ask a slightly longer question.")),
  planSummary: cleanText(1200).default(""),
});

export type AskRequest = z.infer<typeof askRequestSchema>;

/* ---------- Model output (structured) ---------- */

export const modelPlanSchema = z.object({
  headline: z.string().describe("One sentence, max 140 characters, naming the single most important move today."),
  summary: z.string().describe("Two or three sentences explaining today's air for this household in plain language."),
  routine: z
    .array(
      z.object({
        time: z.string().describe('Local 24h time "HH:MM".'),
        title: z.string().describe("Short imperative, max 60 characters."),
        detail: z.string().describe("One or two sentences, specific to this household."),
        actionId: z.string().describe('An id from the candidate list, or "" if none applies.'),
      }),
    )
    .describe("4 to 7 time-ordered steps across the day."),
  picks: z
    .array(
      z.object({
        actionId: z.string().describe("An id from the candidate list."),
        why: z.string().describe("Why this matters for this household today, 1-2 sentences."),
        steps: z.array(z.string()).describe("2 or 3 concrete steps."),
      }),
    )
    .describe("4 to 8 actions chosen from the candidates, most impactful first."),
  careNote: z.string().describe("Guidance for children, elders or listed conditions; empty string if none apply."),
});

export type ModelPlan = z.infer<typeof modelPlanSchema>;
