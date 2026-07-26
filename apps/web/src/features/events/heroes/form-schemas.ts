import * as Schema from "effect/Schema";

const PositiveIntegerIdFromString = Schema.FiniteFromString.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isGreaterThan(0))
);

export const HeroEventIdSchema = PositiveIntegerIdFromString.annotate({
  message: "Wybierz event",
});

export const HeroNameSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.trim().length > 0, {
    message: "Podaj nazwę herosa",
  })
);
