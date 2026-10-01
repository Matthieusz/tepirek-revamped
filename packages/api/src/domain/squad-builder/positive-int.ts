import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/** HTTP/API schema for a positive safe integer. */
export const PositiveInt = Schema.Finite.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 1 })
);

/** Build a positive safe-integer schema with one concrete brand key. */
export const brandedPositiveInt = <const Brand extends string>(
  brand: Parameters<typeof Schema.brand<Brand>>[0],
  identifier: Brand = brand
) => PositiveInt.pipe(Schema.brand<Brand>(brand)).annotate({ identifier });

/** Build a branded positive-integer schema and its typed failure parser. */
export const buildBrandedPositiveInt = <const Brand extends string, Error>(
  brand: Parameters<typeof Schema.brand<Brand>>[0],
  parseName: string,
  onError: () => Error
) => {
  const schema = brandedPositiveInt<Brand>(brand);

  const parse = Effect.fn(parseName)(function* parsePositiveInt(input: number) {
    return yield* Schema.decodeEffect(schema)(input).pipe(
      Effect.catchTag("SchemaError", () => Effect.fail(onError()))
    );
  });

  return { parse, schema };
};
