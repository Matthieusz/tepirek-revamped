import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const decodeGoldNumber = Schema.decodeUnknownOption(Schema.NumberFromString);
const decodeGoldInteger = Schema.decodeUnknownOption(
  Schema.NumberFromString.pipe(Schema.check(Schema.isInt()))
);

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
    Math.floor(
      Option.getOrElse(decodeGoldNumber(totalEarnings), () => 0) / 1_000_000
    ) * 1_000_000
  ).toLocaleString("pl-PL", { maximumFractionDigits: 0 });

/**
 * Parses a gold-amount string into a number. An optional trailing "g"
 * means billions: "2g" -> 2_000_000_000, "1.5g" -> 1_500_000_000.
 * Unparseable input returns 0.
 */
export const parseGoldAmount = (value: string): number => {
  const trimmed = value.trim().toLowerCase();
  const hasBillionsSuffix = trimmed.endsWith("g");
  const numericText = hasBillionsSuffix ? trimmed.slice(0, -1) : trimmed;

  const amount = hasBillionsSuffix
    ? decodeGoldNumber(numericText)
    : decodeGoldInteger(numericText);

  return Option.match(amount, {
    onNone: () => 0,
    onSome: (parsedAmount) =>
      hasBillionsSuffix
        ? Math.floor(parsedAmount * 1_000_000_000)
        : parsedAmount,
  });
};
