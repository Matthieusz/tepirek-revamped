import * as Schema from "effect/Schema";

import { parseLevels } from "@/features/calculators/bounty";

export const CalculatorLevelSchema = Schema.Finite.check(
  Schema.isInt({ message: "Podaj liczbę całkowitą od 1 do 500" }),
  Schema.isBetween({
    maximum: 500,
    minimum: 1,
  })
).annotate({ message: "Podaj liczbę całkowitą od 1 do 500" });

export const CalculatorLevelFromStringSchema = Schema.FiniteFromString.check(
  Schema.isInt({ message: "Podaj liczbę całkowitą od 1 do 500" }),
  Schema.isBetween({
    maximum: 500,
    minimum: 1,
  })
).annotate({ message: "Podaj liczbę całkowitą od 1 do 500" });

export const CalculatorItemLevelSchema = Schema.Finite.check(
  Schema.isInt({ message: "Podaj liczbę całkowitą od 1 do 300" }),
  Schema.isBetween({
    maximum: 300,
    minimum: 1,
  })
).annotate({ message: "Podaj liczbę całkowitą od 1 do 300" });

export const CalculatorItemLevelFromStringSchema =
  Schema.FiniteFromString.check(
    Schema.isInt({ message: "Podaj liczbę całkowitą od 1 do 300" }),
    Schema.isBetween({
      maximum: 300,
      minimum: 1,
    })
  ).annotate({ message: "Podaj liczbę całkowitą od 1 do 300" });

export const CalculatorLevelsSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.trim().length > 0, {
    message: "Wprowadź poziomy",
  }),
  Schema.refine((value): value is string => parseLevels(value).length > 0, {
    message: "Wprowadź co najmniej jeden poprawny poziom",
  })
);
