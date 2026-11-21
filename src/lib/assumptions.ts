/**
 * Every assumption behind the impact numbers, named and in one place.
 * Values are deliberately conservative, rounded estimates for typical Indian
 * urban households; sources are summarised in METHOD_NOTES (./impact).
 */

/* ---------- Time ---------- */

export const DAYS_PER_WEEK = 7;
/** A commute is a trip there and a trip back. */
export const TRIPS_PER_COMMUTE_DAY = 2;
export const SLEEP_HOURS = 8;
/** Usual local hours for a morning or evening workout, and children's evening play. */
export const MORNING_EXERCISE_HOUR = 7;
export const EVENING_EXERCISE_HOUR = 18;
export const EVENING_PLAY_HOUR = 17;
/** Hours of peak outdoor air kept out by airing the house only in the clean window. */
export const PEAK_HOURS_KEPT_OUT = 2;

/* ---------- Indoor sources ---------- */

/** One incense stick or mosquito coil: extra PM2.5 in a room (µg/m³), and for how long (hours). */
export const INCENSE_SPIKE_UG_M3 = 100;
export const INCENSE_HOURS = 2;
/** Share of indoor PM2.5 that comes from dust kicked back up by dry sweeping. */
export const RESUSPENDED_DUST_SHARE = 0.05;
/** A frying or tempering spike (µg/m³) over about an hour of cooking. */
export const COOKING_SPIKE_UG_M3 = 60;
export const COOKING_HOURS = 1;

/* ---------- Driving ---------- */

/** Three people sharing one car cut each person's share of the trip by two thirds. */
export const CARPOOL_SHARE_SAVED = 2 / 3;
/** Minutes a day spent idling at signals, and the PM2.5 an idling engine emits (g/hour). */
export const IDLE_MINUTES_PER_DAY = 10;
export const IDLE_PM_G_PER_HOUR = 2;

/* ---------- Fuels and electricity ---------- */

/** India's grid emission factor, kg CO₂ per kWh (CEA baseline, rounded). */
export const GRID_CO2_PER_KWH = 0.71;
export const CO2_PER_KG_LPG = 2.98;
export const CO2_PER_LITRE_KEROSENE = 2.5;
export const CO2_PER_LITRE_PETROL = 2.31;

/** Fine particles released by burning, g PM2.5 per kg (or litre) of fuel. */
export const PM_G_PER_KG_WOOD_COAL = 10;
export const PM_G_PER_LITRE_KEROSENE = 2;
export const PM_G_PER_KG_SOLID_COOKING_FUEL = 8;
export const PM_G_PER_KG_OPEN_BURNING = 8;

/* ---------- Winter heating (one room) ---------- */

export const HEATING_HOURS_PER_DAY = 4;
/** Extra indoor PM2.5 while an unvented heater burns, µg/m³. */
export const HEATING_SMOKE_UG_M3 = 60;
export const ELECTRIC_HEATER_KW = 1.5;
export const GAS_HEATER_KG_LPG_PER_DAY = 0.6;
export const GAS_HEATER_SMOG_G_PER_WEEK = 0.5;
export const GAS_HEATER_SPIKE_UG_M3 = 10;
export const KEROSENE_LITRES_PER_DAY = 0.5;
export const WOOD_COAL_KG_PER_DAY = 3;

/* ---------- Cooking ---------- */

export const LPG_COOKING_KG_PER_DAY = 0.4;
export const LPG_COOKING_SMOG_G_PER_WEEK = 0.2;
export const INDUCTION_KWH_PER_DAY = 1.5;
/** Food fumes remain even without combustion, µg/m³. */
export const INDUCTION_SPIKE_UG_M3 = 30;
export const SOLID_COOKING_FUEL_KG_PER_DAY = 2;
/** A wood, dung or coal kitchen, µg/m³, over about three hours of cooking a day. */
export const SOLID_FUEL_KITCHEN_UG_M3 = 400;
export const SOLID_FUEL_COOKING_HOURS = 3;

/* ---------- Waste ---------- */

/** Leaves or rubbish a household might otherwise burn in the open, kg per week. */
export const OPEN_BURNING_KG_PER_WEEK = 1;
