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

export const CreateSquadGroupPayload = Schema.Struct({
  name: Schema.String,
});

export const SquadGroupSummarySchema = Schema.Struct({
  characterCount: Schema.Number,
  groupId: SquadGroupIdSchema,
  name: Schema.String,
  squadCount: Schema.Number,
  updatedAt: Schema.DateFromString,
});

export const GlobalSquadGroupSummarySchema = Schema.Struct({
  characterCount: Schema.Number,
  groupId: SquadGroupIdSchema,
  name: Schema.String,
  ownerUserId: AppUserIdSchema,
  ownerUserImage: Schema.NullOr(Schema.String),
  ownerUserName: Schema.String,
  squadCount: Schema.Number,
  updatedAt: Schema.DateFromString,
});

export const ListGlobalSquadGroupsPayload = Schema.Struct({
  maxLevel: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  minLevel: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  nameQuery: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

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
  position: Schema.Number,
  profession: MargonemProfessionSchema,
});

export const SquadDetailSchema = Schema.Struct({
  characters: Schema.Array(SquadGroupDetailCharacterSchema),
  name: Schema.String,
  position: Schema.Number,
  squadId: PositiveInt,
});

export const SquadGroupDetailSchema = Schema.Struct({
  accessRole: Schema.Literals(["owner", "editor", "viewer"]),
  groupId: SquadGroupIdSchema,
  name: Schema.String,
  ownerUserId: AppUserIdSchema,
  squads: Schema.Array(SquadDetailSchema),
  updatedAt: Schema.DateFromString,
  visibility: Schema.Literals(["private", "global"]),
});

const SquadCharacterPlacementPayload = Schema.Struct({
  characterId: PositiveInt,
  position: Schema.Number,
});

const SaveSquadPayload = Schema.Struct({
  characters: Schema.Array(SquadCharacterPlacementPayload),
  clientKey: Schema.String,
  name: Schema.String,
  position: Schema.Number,
  squadId: Schema.optionalKey(SquadIdSchema),
});

export const SaveSquadGroupPayload = Schema.Struct({
  expectedUpdatedAt: Schema.DateFromString,
  groupId: SquadGroupIdSchema,
  name: Schema.String,
  squads: Schema.Array(SaveSquadPayload),
});

const SaveSharedSquadCharactersPayload = Schema.Struct({
  characters: Schema.Array(SquadCharacterPlacementPayload),
  squadId: SquadIdSchema,
});

export const SaveSharedSquadGroupCharactersPayload = Schema.Struct({
  expectedUpdatedAt: Schema.DateFromString,
  groupId: SquadGroupIdSchema,
  squads: Schema.Array(SaveSharedSquadCharactersPayload),
});

export const SetSquadGroupVisibilityPayload = Schema.Struct({
  groupId: SquadGroupIdSchema,
  visibility: SquadGroupVisibilitySchema,
});

export const SquadGroupVisibilityChangeSchema = Schema.Struct({
  groupId: SquadGroupIdSchema,
  updatedAt: Schema.DateFromString,
  visibility: SquadGroupVisibilitySchema,
});
