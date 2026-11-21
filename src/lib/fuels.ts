import {
  CO2_PER_KG_LPG,
  CO2_PER_LITRE_KEROSENE,
  COOKING_HOURS,
  COOKING_SPIKE_UG_M3,
  DAYS_PER_WEEK,
  ELECTRIC_HEATER_KW,
  GAS_HEATER_KG_LPG_PER_DAY,
  GAS_HEATER_SMOG_G_PER_WEEK,
  GAS_HEATER_SPIKE_UG_M3,
  GRID_CO2_PER_KWH,
  HEATING_HOURS_PER_DAY,
  HEATING_SMOKE_UG_M3,
  INDUCTION_KWH_PER_DAY,
  INDUCTION_SPIKE_UG_M3,
  KEROSENE_LITRES_PER_DAY,
  LPG_COOKING_KG_PER_DAY,
  LPG_COOKING_SMOG_G_PER_WEEK,
  PM_G_PER_KG_SOLID_COOKING_FUEL,
  PM_G_PER_KG_WOOD_COAL,
  PM_G_PER_LITRE_KEROSENE,
  SOLID_COOKING_FUEL_KG_PER_DAY,
  SOLID_FUEL_COOKING_HOURS,
  SOLID_FUEL_KITCHEN_UG_M3,
  WOOD_COAL_KG_PER_DAY,
} from "./assumptions";
import type { CookingFuel, HeatingSource } from "./schemas";

/** What one way of heating or cooking costs a household each week. */
export interface FuelProfile {
  /** kg CO₂ a week (fossil only; burning wood or dung is counted as biogenic). */
  co2KgPerWeek: number;
  /** g PM2.5 a week released into the neighbourhood. */
  smogGPerWeek: number;
  /** Extra indoor PM2.5 while in use, µg/m³. */
  indoorSpike: number;
  /** Hours a day in use. */
  hoursPerDay: number;
  note: string;
}

const oneDecimal = (n: number) => Math.round(n * 10) / 10;
/** Daily use × emission factor × days in a week. */
const perWeek = (dailyAmount: number, factor: number) => oneDecimal(dailyAmount * factor * DAYS_PER_WEEK);

/** Winter heating for one room. */
export const HEATING: Record<HeatingSource, FuelProfile> = {
  none: {
    co2KgPerWeek: 0,
    smogGPerWeek: 0,
    indoorSpike: 0,
    hoursPerDay: 0,
    note: "Layers and a warm cap do a lot.",
  },
  electric: {
    co2KgPerWeek: perWeek(ELECTRIC_HEATER_KW * HEATING_HOURS_PER_DAY, GRID_CO2_PER_KWH),
    smogGPerWeek: 0,
    indoorSpike: 0,
    hoursPerDay: HEATING_HOURS_PER_DAY,
    note: "No smoke at home, but the grid still burns coal. Heat one closed room and insulate to cut this.",
  },
  gas: {
    co2KgPerWeek: perWeek(GAS_HEATER_KG_LPG_PER_DAY, CO2_PER_KG_LPG),
    smogGPerWeek: GAS_HEATER_SMOG_G_PER_WEEK,
    indoorSpike: GAS_HEATER_SPIKE_UG_M3,
    hoursPerDay: HEATING_HOURS_PER_DAY,
    note: "Low particulate, but releases NO₂ indoors. Keep a window cracked.",
  },
  "wood-coal": {
    co2KgPerWeek: 0,
    smogGPerWeek: perWeek(WOOD_COAL_KG_PER_DAY, PM_G_PER_KG_WOOD_COAL),
    indoorSpike: HEATING_SMOKE_UG_M3,
    hoursPerDay: HEATING_HOURS_PER_DAY,
    note: "The smokiest option by far, indoors and out.",
  },
  kerosene: {
    co2KgPerWeek: perWeek(KEROSENE_LITRES_PER_DAY, CO2_PER_LITRE_KEROSENE),
    smogGPerWeek: perWeek(KEROSENE_LITRES_PER_DAY, PM_G_PER_LITRE_KEROSENE),
    indoorSpike: HEATING_SMOKE_UG_M3,
    hoursPerDay: HEATING_HOURS_PER_DAY,
    note: "Unvented kerosene heaters fill rooms with fine particles and fumes.",
  },
};

export const COOKING: Record<CookingFuel, FuelProfile> = {
  lpg: {
    co2KgPerWeek: perWeek(LPG_COOKING_KG_PER_DAY, CO2_PER_KG_LPG),
    smogGPerWeek: LPG_COOKING_SMOG_G_PER_WEEK,
    indoorSpike: COOKING_SPIKE_UG_M3,
    hoursPerDay: COOKING_HOURS,
    note: "Clean-burning; frying still makes a particle spike, so run the exhaust.",
  },
  electric: {
    co2KgPerWeek: perWeek(INDUCTION_KWH_PER_DAY, GRID_CO2_PER_KWH),
    smogGPerWeek: 0,
    indoorSpike: INDUCTION_SPIKE_UG_M3,
    hoursPerDay: COOKING_HOURS,
    note: "No combustion at home; cooking fumes from food remain.",
  },
  biomass: {
    co2KgPerWeek: 0,
    smogGPerWeek: perWeek(SOLID_COOKING_FUEL_KG_PER_DAY, PM_G_PER_KG_SOLID_COOKING_FUEL),
    indoorSpike: SOLID_FUEL_KITCHEN_UG_M3,
    hoursPerDay: SOLID_FUEL_COOKING_HOURS,
    note: "Kitchens often reach hundreds of µg/m³; the cook and small children breathe most of it.",
  },
};

/** Whether a heater burns fuel inside the home. */
export const burnsIndoors = (heating: HeatingSource) => heating === "wood-coal" || heating === "kerosene";
