import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { PositiveInt } from "./positive-int.ts";

/** A parsed Margonem profile id. */
export const MargonemProfileId = PositiveInt.pipe(
  Schema.brand("MargonemProfileId")
).annotate({
  identifier: "MargonemProfileId",
});
export type MargonemProfileId = typeof MargonemProfileId.Type;

/** A parsed Margonem character id. */
export const MargonemCharacterId = PositiveInt.pipe(
  Schema.brand("MargonemCharacterId")
).annotate({
  identifier: "MargonemCharacterId",
});
export type MargonemCharacterId = typeof MargonemCharacterId.Type;

/** A positive character level. */
export const PositiveLevel = PositiveInt.pipe(
  Schema.brand("PositiveLevel")
).annotate({
  identifier: "PositiveLevel",
});
export type PositiveLevel = typeof PositiveLevel.Type;

/** Failure returned when a numeric id is not valid for the domain. */
export class InvalidPositiveInteger extends Schema.TaggedErrorClass<InvalidPositiveInteger>()(
  "InvalidPositiveInteger",
  {
    field: Schema.String,
  }
) {}

/** Parse a positive integer as a Margonem profile id. */
export const parseMargonemProfileId = Effect.fn("MargonemProfileId.parse")(
  function* parseMargonemProfileId(value: number) {
    return yield* Schema.decodeUnknownEffect(MargonemProfileId)(value).pipe(
      Effect.catchTag(
        "SchemaError",
        () => new InvalidPositiveInteger({ field: "profileId" })
      )
    );
  }
);

/** Parse a positive integer as a Margonem character id. */
export const parseMargonemCharacterId = Effect.fn("MargonemCharacterId.parse")(
  function* parseMargonemCharacterId(value: number) {
    return yield* Schema.decodeUnknownEffect(MargonemCharacterId)(value).pipe(
      Effect.catchTag(
        "SchemaError",
        () => new InvalidPositiveInteger({ field: "characterId" })
      )
    );
  }
);

/** Parse a positive integer as a character level. */
export const parsePositiveLevel = Effect.fn("PositiveLevel.parse")(
  function* parsePositiveLevel(value: number) {
    return yield* Schema.decodeUnknownEffect(PositiveLevel)(value).pipe(
      Effect.catchTag(
        "SchemaError",
        () => new InvalidPositiveInteger({ field: "level" })
      )
    );
  }
);
