import * as Schema from "effect/Schema";

import { makeBrandedPositiveInt } from "./positive-int.ts";

/** Failure returned when a numeric id is not valid for the domain. */
export class InvalidPositiveInteger extends Schema.TaggedErrorClass<InvalidPositiveInteger>()(
  "InvalidPositiveInteger",
  {
    field: Schema.String,
  }
) {}

const brandedMargonemProfileId = makeBrandedPositiveInt(
  "MargonemProfileId",
  "MargonemProfileId.parse",
  () => new InvalidPositiveInteger({ field: "profileId" })
);
const brandedMargonemCharacterId = makeBrandedPositiveInt(
  "MargonemCharacterId",
  "MargonemCharacterId.parse",
  () => new InvalidPositiveInteger({ field: "characterId" })
);
const brandedPositiveLevel = makeBrandedPositiveInt(
  "PositiveLevel",
  "PositiveLevel.parse",
  () => new InvalidPositiveInteger({ field: "level" })
);

/** A parsed Margonem profile id. */
export const MargonemProfileId = brandedMargonemProfileId.schema;
export type MargonemProfileId = typeof MargonemProfileId.Type;

/** A parsed Margonem character id. */
export const MargonemCharacterId = brandedMargonemCharacterId.schema;
export type MargonemCharacterId = typeof MargonemCharacterId.Type;

/** A positive character level. */
export const PositiveLevel = brandedPositiveLevel.schema;
export type PositiveLevel = typeof PositiveLevel.Type;

/** Parse a positive integer as a Margonem profile id. */
export const parseMargonemProfileId = brandedMargonemProfileId.parse;

/** Parse a positive integer as a Margonem character id. */
export const parseMargonemCharacterId = brandedMargonemCharacterId.parse;

/** Parse a positive integer as a character level. */
export const parsePositiveLevel = brandedPositiveLevel.parse;
