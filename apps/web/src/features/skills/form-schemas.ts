import * as Schema from "effect/Schema";

const PositiveIntegerIdFromString = Schema.FiniteFromString.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isGreaterThan(0))
);

export const SkillLinkSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.trim().length > 0, {
    message: "Podaj link do zestawu umiejętności",
  })
);

export const SkillNameSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.trim().length > 0, {
    message: "Podaj nazwę zestawu umiejętności",
  })
);

export const SkillProfessionIdSchema = PositiveIntegerIdFromString.annotate({
  message: "Wybierz profesję",
});
