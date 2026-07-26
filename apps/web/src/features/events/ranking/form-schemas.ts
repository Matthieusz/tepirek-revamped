import * as Schema from "effect/Schema";

import { parseGoldAmount } from "@/lib/gold";

const PositiveIntegerIdFromString = Schema.FiniteFromString.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isGreaterThan(0))
);

export const GoldAmountSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.trim().length > 0, {
    message: "Podaj kwotę złota",
  }),
  Schema.refine((value): value is string => parseGoldAmount(value) > 0, {
    message: "Podaj prawidłową kwotę złota",
  })
);

export const RequiredSelectionSchema = (message: string) =>
  PositiveIntegerIdFromString.annotate({ message });
