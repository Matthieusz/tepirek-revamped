import { fail, success } from "./outcome.js";
import type { Outcome } from "./outcome.js";
import { PositiveInt } from "./positive-int.js";
import { isPositiveInteger } from "./prelude.js";

/** A parsed Margonem profile id. */
export type MargonemProfileId = number & {
  readonly __brand: "MargonemProfileId";
};

/** HTTP/API schema for a parsed Margonem profile id. */
export const MargonemProfileIdSchema = PositiveInt.annotate({
  identifier: "MargonemProfileId",
});

/** HTTP/API schema for a parsed Margonem character id. */
export const MargonemCharacterIdSchema = PositiveInt.annotate({
  identifier: "MargonemCharacterId",
});

/** HTTP/API schema for a positive character level. */
export const PositiveLevelSchema = PositiveInt.annotate({
  identifier: "PositiveLevel",
});

/** A parsed Margonem character id. */
export type MargonemCharacterId = number & {
  readonly __brand: "MargonemCharacterId";
};

/** A positive character level. */
export type PositiveLevel = number & { readonly __brand: "PositiveLevel" };

/** Failure returned when a numeric id is not valid for the domain. */
export interface InvalidPositiveInteger {
  readonly _tag: "InvalidPositiveInteger";
  readonly field: string;
}

/** Parse a positive integer as a Margonem profile id. */
export const parseMargonemProfileId = (
  value: number
): Outcome<MargonemProfileId, InvalidPositiveInteger> => {
  if (!isPositiveInteger(value)) {
    return fail({ _tag: "InvalidPositiveInteger", field: "profileId" });
  }

  // SAFETY: isPositiveInteger established the MargonemProfileId invariant.
  return success(value as MargonemProfileId);
};

/** Parse a positive integer as a Margonem character id. */
export const parseMargonemCharacterId = (
  value: number
): Outcome<MargonemCharacterId, InvalidPositiveInteger> => {
  if (!isPositiveInteger(value)) {
    return fail({ _tag: "InvalidPositiveInteger", field: "characterId" });
  }

  // SAFETY: isPositiveInteger established the MargonemCharacterId invariant.
  return success(value as MargonemCharacterId);
};

/** Parse a positive integer as a character level. */
export const parsePositiveLevel = (
  value: number
): Outcome<PositiveLevel, InvalidPositiveInteger> => {
  if (!isPositiveInteger(value)) {
    return fail({ _tag: "InvalidPositiveInteger", field: "level" });
  }

  // SAFETY: isPositiveInteger established the PositiveLevel invariant.
  return success(value as PositiveLevel);
};

/** Convert a Margonem profile id to its primitive representation. */
export const profileIdToNumber = (profileId: MargonemProfileId): number =>
  profileId;

/** Convert a Margonem character id to its primitive representation. */
export const characterIdToNumber = (characterId: MargonemCharacterId): number =>
  characterId;

/** Convert a character level to its primitive representation. */
export const levelToNumber = (level: PositiveLevel): number => level;
