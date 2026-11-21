import { describe, expect, it } from "vitest";
import { buildContext } from "@/lib/impact";
import { detectTopic, parseRoomArea, quickAnswer } from "@/lib/quickAnswers";
import type { Household } from "@/lib/schemas";
import { makeAir, makeHousehold } from "../fixtures";

const ctxFor = (household: Partial<Household> = {}, aqi?: number, pmScale = 1) => {
  const base = makeAir();
  const air = {
    ...base,
    aqi: aqi ?? base.aqi,
    hourly: base.hourly.map((h) => ({ ...h, aqi: Math.round(h.aqi * pmScale), pm25: h.pm25 * pmScale })),
  };
  return buildContext(makeHousehold(household), air);
};

describe("detectTopic", () => {
  it.each([
    ["Is it safe for the kids to play outside this evening?", "children"],
    ["What size purifier do I need for a 12 m² bedroom?", "purifier"],
    ["Does hanging a wet cloth on the window help?", "wet-cloth"],
    ["Should I still go for my morning walk?", "exercise"],
    ["Will a money plant clean the air?", "plants"],
    ["Is an N95 better than a surgical mask?", "mask"],
    ["When should I open the windows?", "ventilation"],
    ["How do I cook without smoke in the kitchen?", "cooking"],
    ["Is my angithi safe at night?", "heating"],
    ["My father has chest pain after his walk", "symptoms"],
    ["What's the weather like on Mars?", "general"],
  ])("routes %j to %s", (question, topic) => {
    expect(detectTopic(question)).toBe(topic);
  });

  it("puts urgent symptoms ahead of everything else", () => {
    expect(detectTopic("My son is wheezing after playing in the park")).toBe("symptoms");
  });
});

describe("parseRoomArea", () => {
  it.each([
    ["a 12 m² bedroom", 12],
    ["room of 15m2", 15],
    ["about 9.5 sq m", 9.5],
    ["a 120 sq ft room", 11.1],
    ["my bedroom", null],
  ])("reads %j as %s", (text, area) => {
    expect(parseRoomArea(text)).toBe(area);
  });
});

describe("quickAnswer", () => {
  it("keeps children indoors when even the clean window is unhealthy", () => {
    // Scale the fixture so even its cleanest window is above AQI 150.
    const { text } = quickAnswer("Can the kids play outside?", ctxFor({}, undefined, 1.5));
    expect(text).toMatch(/keep play indoors/);
    expect(text).toContain("AQI 211");
  });

  it("allows gentle play in the clean window on a better day", () => {
    const { text } = quickAnswer("Can the kids play outside?", ctxFor({}, 90, 0.3));
    expect(text).toMatch(/reasonable/);
  });

  it("sizes a purifier from the room in the question", () => {
    const { text } = quickAnswer("What purifier for a 12 m² room?", ctxFor());
    expect(text).toContain("168 m³/h");
    expect(text).toContain("99 CFM");
  });

  it("gives the general sizing rule without a room size", () => {
    expect(quickAnswer("Which purifier should I buy?", ctxFor()).text).toMatch(/five air changes/);
  });

  it("tailors cooking and heating advice to the household", () => {
    expect(quickAnswer("Kitchen smoke?", ctxFor({ cookingFuel: "biomass" })).text).toMatch(/LPG or induction/);
    expect(quickAnswer("Kitchen smoke?", ctxFor({ cookingFuel: "lpg" })).text).toMatch(/exhaust/);
    expect(quickAnswer("Is my heater ok?", ctxFor({ heating: "kerosene" })).text).toMatch(/electric heater/);
  });

  it("sends urgent symptoms to medical care first", () => {
    expect(quickAnswer("Grandma has chest pain", ctxFor()).text).toMatch(/^If someone has chest pain/);
  });

  it("answers off-topic questions with the live reading and what it can help with", () => {
    const { topic, text } = quickAnswer("Tell me a joke", ctxFor());
    expect(topic).toBe("general");
    expect(text).toContain("US AQI 211");
    expect(text).toMatch(/I can answer quick questions/);
  });

  it("never returns an empty answer", () => {
    for (const q of ["kids", "walk", "purifier", "mask", "window", "plant", "wet towel", "cook", "heater", "chest pain", "?"]) {
      expect(quickAnswer(q, ctxFor()).text.length).toBeGreaterThan(60);
    }
  });
});
