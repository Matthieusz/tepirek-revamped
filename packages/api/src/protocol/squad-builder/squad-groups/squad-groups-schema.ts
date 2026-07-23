/* eslint-disable import/namespace, typescript/no-empty-interface, typescript/no-empty-object-type -- Schema record interfaces intentionally merge runtime schemas with their inferred types. */
import * as Schema from "effect/Schema";

import { AppUserIdSchema } from "../../../domain/squad-builder/app-user-id.ts";
import { MargonemAccountIdSchema } from "../../../domain/squad-builder/margonem-account-id.ts";
import { MargonemProfessionSchema } from "../../../domain/squad-builder/margonem-character.ts";
import { PositiveInt } from "../../../domain/squad-builder/positive-int.ts";
import { SquadGroupIdSchema } from "../../../domain/squad-builder/squad-group-id.ts";
import { SquadGroupVisibilitySchema } from "../../../domain/squad-builder/squad-group-visibility.ts";
import { SquadIdSchema } from "../../../domain/squad-builder/squad-id.ts";

export const SquadGroupIdPayload = Schema.Struct({
  groupId: SquadGroupIdSchema,
});
export interface SquadGroupIdPayload extends Schema.Schema.Type<
  typeof SquadGroupIdPayload
> {}

export const DeleteSquadGroupSuccessSchema = Schema.Struct({
  groupId: SquadGroupIdSchema,
});
export interface DeleteSquadGroupSuccessSchema extends Schema.Schema.Type<
  typeof DeleteSquadGroupSuccessSchema
> {}

export const CreateSquadGroupPayload = Schema.Struct({
  name: Schema.String,
});
export interface CreateSquadGroupPayload extends Schema.Schema.Type<
  typeof CreateSquadGroupPayload
> {}

export const SquadGroupSummarySchema = Schema.Struct({
  characterCount: Schema.Finite,
  groupId: SquadGroupIdSchema,
  name: Schema.String,
  squadCount: Schema.Finite,
  updatedAt: Schema.DateFromString,
});
export interface SquadGroupSummarySchema extends Schema.Schema.Type<
  typeof SquadGroupSummarySchema
> {}

export const GlobalSquadGroupSummarySchema = Schema.Struct({
  characterCount: Schema.Finite,
  groupId: SquadGroupIdSchema,
  name: Schema.String,
  ownerUserId: AppUserIdSchema,
  ownerUserImage: Schema.NullOr(Schema.String),
  ownerUserName: Schema.String,
  squadCount: Schema.Finite,
  updatedAt: Schema.DateFromString,
});
export interface GlobalSquadGroupSummarySchema extends Schema.Schema.Type<
  typeof GlobalSquadGroupSummarySchema
> {}

export const ListGlobalSquadGroupsPayload = Schema.Struct({
  maxLevel: Schema.optionalKey(Schema.NullOr(Schema.Finite)),
  minLevel: Schema.optionalKey(Schema.NullOr(Schema.Finite)),
  nameQuery: Schema.optionalKey(Schema.NullOr(Schema.String)),
});
export interface ListGlobalSquadGroupsPayload extends Schema.Schema.Type<
  typeof ListGlobalSquadGroupsPayload
> {}

export const AvailableSquadCharacterSchema = Schema.Struct({
  accountDisplayName: Schema.String,
  accountId: MargonemAccountIdSchema,
  accountOwnerUserId: AppUserIdSchema,
  accountOwnerUserImage: Schema.NullOr(Schema.String),
  accountOwnerUserName: Schema.String,
  avatarUrl: Schema.NullOr(Schema.String),
  characterId: PositiveInt,
  level: PositiveInt,
  margonemCharacterId: PositiveInt,
  name: Schema.String,
  profession: MargonemProfessionSchema,
  world: Schema.String,
});
export interface AvailableSquadCharacterSchema extends Schema.Schema.Type<
  typeof AvailableSquadCharacterSchema
> {}

export const SquadGroupDetailCharacterSchema = Schema.Struct({
  accountDisplayName: Schema.String,
  accountId: MargonemAccountIdSchema,
  accountOwnerUserImage: Schema.NullOr(Schema.String),
  accountOwnerUserName: Schema.String,
  avatarUrl: Schema.NullOr(Schema.String),
  characterId: PositiveInt,
  level: PositiveInt,
  margonemCharacterId: PositiveInt,
  name: Schema.String,
  placementId: PositiveInt,
  position: Schema.Finite,
  profession: MargonemProfessionSchema,
});
export interface SquadGroupDetailCharacterSchema extends Schema.Schema.Type<
  typeof SquadGroupDetailCharacterSchema
> {}

export const SquadDetailSchema = Schema.Struct({
  characters: Schema.Array(SquadGroupDetailCharacterSchema),
  name: Schema.String,
  position: Schema.Finite,
  squadId: PositiveInt,
});
export interface SquadDetailSchema extends Schema.Schema.Type<
  typeof SquadDetailSchema
> {}

export const SquadGroupDetailSchema = Schema.Struct({
  accessRole: Schema.Literals(["owner", "editor", "viewer"]),
  groupId: SquadGroupIdSchema,
  name: Schema.String,
  ownerUserId: AppUserIdSchema,
  squads: Schema.Array(SquadDetailSchema),
  updatedAt: Schema.DateFromString,
  visibility: Schema.Literals(["private", "global"]),
});
export interface SquadGroupDetailSchema extends Schema.Schema.Type<
  typeof SquadGroupDetailSchema
> {}

const SquadCharacterPlacementPayload = Schema.Struct({
  characterId: PositiveInt,
  position: Schema.Finite,
});

const SaveSquadPayload = Schema.Struct({
  characters: Schema.Array(SquadCharacterPlacementPayload),
  clientKey: Schema.String,
  name: Schema.String,
  position: Schema.Finite,
  squadId: Schema.optionalKey(SquadIdSchema),
});

export const SaveSquadGroupPayload = Schema.Struct({
  expectedUpdatedAt: Schema.DateFromString,
  groupId: SquadGroupIdSchema,
  name: Schema.String,
  squads: Schema.Array(SaveSquadPayload),
});
export interface SaveSquadGroupPayload extends Schema.Schema.Type<
  typeof SaveSquadGroupPayload
> {}

const SaveSharedSquadCharactersPayload = Schema.Struct({
  characters: Schema.Array(SquadCharacterPlacementPayload),
  squadId: SquadIdSchema,
});

export const SaveSharedSquadGroupCharactersPayload = Schema.Struct({
  expectedUpdatedAt: Schema.DateFromString,
  groupId: SquadGroupIdSchema,
  squads: Schema.Array(SaveSharedSquadCharactersPayload),
});
export interface SaveSharedSquadGroupCharactersPayload extends Schema.Schema
  .Type<typeof SaveSharedSquadGroupCharactersPayload> {}

export const SetSquadGroupVisibilityPayload = Schema.Struct({
  groupId: SquadGroupIdSchema,
  visibility: SquadGroupVisibilitySchema,
});
export interface SetSquadGroupVisibilityPayload extends Schema.Schema.Type<
  typeof SetSquadGroupVisibilityPayload
> {}

export const SquadGroupVisibilityChangeSchema = Schema.Struct({
  groupId: SquadGroupIdSchema,
  updatedAt: Schema.DateFromString,
  visibility: SquadGroupVisibilitySchema,
});
export interface SquadGroupVisibilityChangeSchema extends Schema.Schema.Type<
  typeof SquadGroupVisibilityChangeSchema
> {}
