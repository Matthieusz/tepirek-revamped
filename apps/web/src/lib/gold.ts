/**
 * Formats a string earnings value by rounding down to whole millions,
 * using Polish locale grouping. Used by the Skarbiec (vault) workflow.
 */
export const formatVaultEarnings = (totalEarnings: string) => {
  const parsedEarnings = Number(totalEarnings);
  const earnings = Number.isFinite(parsedEarnings) ? parsedEarnings : 0;

  return (Math.floor(earnings / 1_000_000) * 1_000_000).toLocaleString(
    "pl-PL",
    { maximumFractionDigits: 0 }
  );
};

const shorthandMultipliers = new Map([
  ["g", 1_000_000_000],
  ["m", 1_000_000],
]);

/**
 * Parse a gold amount, returning `undefined` when the input is invalid.
 *
 * A trailing `m` means millions and `g` means billions. Decimal values are
 * accepted only with a suffix, for example `700m` and `1.2g`.
 */
export const tryParseGoldAmount: (value: string) => number | undefined = (
  value: string
) => {
  const trimmed = value.trim().toLowerCase();
  const suffix = trimmed.at(-1);

  const multiplier =
    suffix === undefined ? undefined : shorthandMultipliers.get(suffix);

  const numericText = multiplier === undefined ? trimmed : trimmed.slice(0, -1);
  const parsedAmount = Number(numericText);

  const normalizedAmount =
    multiplier === undefined
      ? parsedAmount
      : Math.floor(parsedAmount * multiplier);

  return numericText.length > 0 && Number.isSafeInteger(normalizedAmount)
    ? normalizedAmount
    : undefined;
};

/**
 * Format a gold amount using the shortest exact `m` or `g` representation.
 *
 * Values without a shorter shorthand representation remain plain integers.
 */
export const formatGoldAmountInput = (value: number) => {
  let formattedAmount = value.toString();

  for (const [suffix, multiplier] of shorthandMultipliers) {
    if (value < multiplier) {
      continue;
    }

    const shorthandAmount = `${value / multiplier}${suffix}`;

    if (
      shorthandAmount.length < formattedAmount.length &&
      tryParseGoldAmount(shorthandAmount) === value
    ) {
      formattedAmount = shorthandAmount;
    }
  }

  return formattedAmount;
};

/**
 * Parse a gold amount with optional `m` or `g` shorthand.
 *
 * Unparseable input returns zero for preview and form-validation callers.
 */
export const parseGoldAmount = (value: string) =>
  tryParseGoldAmount(value) ?? 0;
