/* eslint-disable max-classes-per-file -- Validation variants are one domain-owned error union. */
import * as Schema from "effect/Schema";

import { MargonemAccountId } from "./margonem-account-id.ts";
import { InvalidSquadGroupName, InvalidSquadName } from "./squad-name.ts";
import { MAX_SQUAD_CHARACTERS } from "./squad-placement.ts";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class InvalidSquadSnapshot extends Schema.TaggedError<InvalidSquadSnapshot>()(
  "InvalidSquadSnapshot",
  { message: Schema.String }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class TooManyCharactersInSquad extends Schema.TaggedError<TooManyCharactersInSquad>()(
  "TooManyCharactersInSquad",
  {
    maxCharacters: Schema.Literal(MAX_SQUAD_CHARACTERS),
    squadClientKey: Schema.String,
  }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class DuplicateCharacterInSquad extends Schema.TaggedError<DuplicateCharacterInSquad>()(
  "DuplicateCharacterInSquad",
  {
    characterId: Schema.Finite,
    squadClientKey: Schema.String,
  }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class DuplicateAccountInSquad extends Schema.TaggedError<DuplicateAccountInSquad>()(
  "DuplicateAccountInSquad",
  {
    accountId: MargonemAccountId,
    squadClientKey: Schema.String,
  }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class DuplicateCharacterInSquadGroup extends Schema.TaggedError<DuplicateCharacterInSquadGroup>()(
  "DuplicateCharacterInSquadGroup",
  { characterId: Schema.Finite }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadCharacterNotAccessible extends Schema.TaggedError<SquadCharacterNotAccessible>()(
  "SquadCharacterNotAccessible",
  { characterId: Schema.Finite }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadCharacterNotJaruna extends Schema.TaggedError<SquadCharacterNotJaruna>()(
  "SquadCharacterNotJaruna",
  { characterId: Schema.Finite }
) {}

export const SquadGroupValidationErrorSchema = Schema.Union([
  InvalidSquadGroupName,
  InvalidSquadName,
  InvalidSquadSnapshot,
  TooManyCharactersInSquad,
  DuplicateCharacterInSquad,
  DuplicateAccountInSquad,
  DuplicateCharacterInSquadGroup,
  SquadCharacterNotAccessible,
  SquadCharacterNotJaruna,
]);

export type SquadGroupValidationError =
  typeof SquadGroupValidationErrorSchema.Type;
