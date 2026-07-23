/* eslint-disable max-classes-per-file -- Validation variants are one domain-owned error union. */
import * as Schema from "effect/Schema";

import { MargonemAccountIdSchema } from "./margonem-account-id.ts";
import { InvalidSquadGroupName, InvalidSquadName } from "./squad-name.ts";

export class InvalidSquadSnapshot extends Schema.TaggedErrorClass<InvalidSquadSnapshot>()(
  "InvalidSquadSnapshot",
  { message: Schema.String }
) {}

export class TooManyCharactersInSquad extends Schema.TaggedErrorClass<TooManyCharactersInSquad>()(
  "TooManyCharactersInSquad",
  {
    maxCharacters: Schema.Literal(10),
    squadClientKey: Schema.String,
  }
) {}

export class DuplicateCharacterInSquad extends Schema.TaggedErrorClass<DuplicateCharacterInSquad>()(
  "DuplicateCharacterInSquad",
  {
    characterId: Schema.Finite,
    squadClientKey: Schema.String,
  }
) {}

export class DuplicateAccountInSquad extends Schema.TaggedErrorClass<DuplicateAccountInSquad>()(
  "DuplicateAccountInSquad",
  {
    accountId: MargonemAccountIdSchema,
    squadClientKey: Schema.String,
  }
) {}

export class DuplicateCharacterInSquadGroup extends Schema.TaggedErrorClass<DuplicateCharacterInSquadGroup>()(
  "DuplicateCharacterInSquadGroup",
  { characterId: Schema.Finite }
) {}

export class SquadCharacterNotAccessible extends Schema.TaggedErrorClass<SquadCharacterNotAccessible>()(
  "SquadCharacterNotAccessible",
  { characterId: Schema.Finite }
) {}

export class SquadCharacterNotJaruna extends Schema.TaggedErrorClass<SquadCharacterNotJaruna>()(
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
