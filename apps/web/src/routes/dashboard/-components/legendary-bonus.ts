const legendaryBonusLabels = new Map<string, string>([
  ["anguish", "Krwawa udręka"],
  ["cleanse", "Płomienne oczyszczenie"],
  ["critred", "Krytyczna osłona"],
  ["curse", "Klątwa"],
  ["dmgred", "Fizyczna osłona"],
  ["facade", "Fasada opieki"],
  ["glare", "Oślepienie"],
  ["holytouch", "Dotyk anioła"],
  ["lastheal", "Ostatni ratunek"],
  ["puncture", "Przeszywająca skuteczność"],
  ["pushback", "Odrzut"],
  ["resgain", "Ochrona żywiołów"],
  ["verycrit", "Cios bardzo krytyczny"],
]);

const trailingBonusLevelPattern = /,\d+$/u;

/**
 * Present a stored legendary bonus using its Polish in-game name.
 *
 * The trailing item level encoded by Margonem is omitted. Unknown bonus codes
 * remain visible so newly introduced bonuses do not render as empty labels.
 */
export const formatLegendaryBonus = (value: string): string => {
  const bonusCode = value.trim().replace(trailingBonusLevelPattern, "");
  return legendaryBonusLabels.get(bonusCode) ?? bonusCode;
};
