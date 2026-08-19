import { describe, expect, it } from "vitest";

import { formatLegendaryBonus } from "@/routes/dashboard/-components/legendary-bonus";

const legendaryBonusTranslations = [
  ["anguish,100", "Krwawa udręka"],
  ["cleanse,100", "Płomienne oczyszczenie"],
  ["critred,100", "Krytyczna osłona"],
  ["curse,26", "Klątwa"],
  ["facade,100", "Fasada opieki"],
  ["glare,100", "Oślepienie"],
  ["holytouch,100", "Dotyk anioła"],
  ["lastheal,100", "Ostatni ratunek"],
  ["puncture,100", "Przeszywająca skuteczność"],
  ["verycrit,100", "Cios bardzo krytyczny"],
] as const;

describe("legendary bonus labels", () => {
  it.each(legendaryBonusTranslations)(
    "maps %s to the Polish in-game name %s",
    (value, expectedLabel) => {
      expect(formatLegendaryBonus(value)).toBe(expectedLabel);
    }
  );

  it("removes the trailing level from an unknown bonus", () => {
    expect(formatLegendaryBonus("futurebonus,300")).toBe("futurebonus");
  });

  it.each([
    ["dmgred,100", "Fizyczna osłona"],
    ["pushback,100", "Odrzut"],
    ["resgain,100", "Ochrona żywiołów"],
  ])("keeps the legacy mapping for %s", (value, expectedLabel) => {
    expect(formatLegendaryBonus(value)).toBe(expectedLabel);
  });
});
