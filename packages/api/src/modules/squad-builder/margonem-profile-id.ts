import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { PositiveInt } from "./positive-int.js";

/** A parsed Margonem profile id. */
export const MargonemProfileId = PositiveInt.pipe(
  Schema.brand("MargonemProfileId")
).annotate({
  identifier: "MargonemProfileId",
});
export type MargonemProfileId = typeof MargonemProfileId.Type;

/** HTTP/API schema for a parsed Margonem profile id. */
export const MargonemProfileIdSchema = PositiveInt.annotate({
  identifier: "MargonemProfileId",
});

/** A parsed Margonem character id. */
export const MargonemCharacterId = PositiveInt.pipe(
  Schema.brand("MargonemCharacterId")
).annotate({
  identifier: "MargonemCharacterId",
});
export type MargonemCharacterId = typeof MargonemCharacterId.Type;

/** HTTP/API schema for a parsed Margonem character id. */
export const MargonemCharacterIdSchema = PositiveInt.annotate({
  identifier: "MargonemCharacterId",
});

/** A positive character level. */
export const PositiveLevel = PositiveInt.pipe(
  Schema.brand("PositiveLevel")
).annotate({
  identifier: "PositiveLevel",
});
export type PositiveLevel = typeof PositiveLevel.Type;

/** HTTP/API schema for a positive character level. */
export const PositiveLevelSchema = PositiveInt.annotate({
  identifier: "PositiveLevel",
});

/** Failure returned when a numeric id is not valid for the domain. */
export interface InvalidPositiveInteger {
  readonly _tag: "InvalidPositiveInteger";
  readonly field: string;
}

/** Parse a positive integer as a Margonem profile id. */
export const parseMargonemProfileId = Effect.fn("MargonemProfileId.parse")(
  function* parseMargonemProfileId(value: number) {
    return yield* Schema.decodeUnknownEffect(MargonemProfileId)(value).pipe(
      Effect.catchTag("SchemaError", () =>
        Effect.fail({
          _tag: "InvalidPositiveInteger",
          field: "profileId",
        } as const)
      )
    );
  }
);

/** Parse a positive integer as a Margonem character id. */
export const parseMargonemCharacterId = Effect.fn("MargonemCharacterId.parse")(
  function* parseMargonemCharacterId(value: number) {
    return yield* Schema.decodeUnknownEffect(MargonemCharacterId)(value).pipe(
      Effect.catchTag("SchemaError", () =>
        Effect.fail({
          _tag: "InvalidPositiveInteger",
          field: "characterId",
        } as const)
      )
    );
  }
);

/** Parse a positive integer as a character level. */
export const parsePositiveLevel = Effect.fn("PositiveLevel.parse")(
  function* parsePositiveLevel(value: number) {
    return yield* Schema.decodeUnknownEffect(PositiveLevel)(value).pipe(
      Effect.catchTag("SchemaError", () =>
        Effect.fail({ _tag: "InvalidPositiveInteger", field: "level" } as const)
      )
    );
  }
);

/** Convert a Margonem profile id to its primitive representation. */
export const profileIdToNumber = (profileId: MargonemProfileId): number =>
  profileId;

/** Convert a Margonem character id to its primitive representation. */
export const characterIdToNumber = (characterId: MargonemCharacterId): number =>
  characterId;

/** Convert a character level to its primitive representation. */
export const levelToNumber = (level: PositiveLevel): number => level;
