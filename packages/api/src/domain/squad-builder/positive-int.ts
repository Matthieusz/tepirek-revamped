import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/** HTTP/API schema for a positive safe integer. */
export const PositiveInt = Schema.Finite.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 1 })
);

export const brandedPositiveInt = <const Brand extends string>(
  brand: Brand,
  identifier: Brand = brand
) => PositiveInt.pipe(Schema.brand(brand)).annotate({ identifier });

export const makeBrandedPositiveInt = <const Brand extends string, Error>(
  brand: Brand,
  parseName: string,
  onError: () => Error
) => {
  const schema = brandedPositiveInt(brand);
  const parse = Effect.fn(parseName)(function* parsePositiveInt(input: number) {
    return yield* Schema.decodeUnknownEffect(schema)(input).pipe(
      Effect.catchTag("SchemaError", () => Effect.fail(onError()))
    );
  });

  return { parse, schema };
};
