/**
 * Gold-value parsing and vault-earnings formatting.
 *
 * Single source of truth for two rules that were previously duplicated
 * across the vault page, the vault user card, and the distribute-gold
 * modal: rounding earnings down to whole millions for display, and
 * parsing a gold-amount string with an optional "g"-for-billions suffix.
 * React stays out; this is a pure value module.
 */

/**
 * Formats a string earnings value by rounding down to whole millions,
 * using Polish locale grouping. Used by the Skarbiec (vault) workflow.
 */
export const formatVaultEarnings = (totalEarnings: string): string =>
  (
    Math.floor(Number.parseFloat(totalEarnings || "0") / 1_000_000) * 1_000_000
  ).toLocaleString("pl-PL", { maximumFractionDigits: 0 });

/**
 * Parses a gold-amount string into a number. An optional trailing "g"
 * means billions: "2g" -> 2_000_000_000, "1.5g" -> 1_500_000_000.
 * Unparseable input returns 0.
 */
export const parseGoldAmount = (value: string): number => {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.endsWith("g")) {
    const num = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isNaN(num) ? 0 : Math.floor(num * 1_000_000_000);
  }
  const num = Number.parseInt(trimmed, 10);
  return Number.isNaN(num) ? 0 : num;
};
