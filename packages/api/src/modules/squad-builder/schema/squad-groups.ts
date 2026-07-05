import * as Schema from "effect/Schema";

import { AppUserIdSchema } from "../app-user-id.js";
import { MargonemAccountIdSchema } from "../margonem-account-id.js";
import { MargonemProfessionSchema } from "../margonem-character.js";
import { PositiveInt } from "../positive-int.js";
import { SquadGroupIdSchema } from "../squad-group-id.js";

export const SquadGroupIdPayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  groupId: SquadGroupIdSchema,
});

export const CreateSquadGroupPayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  name: Schema.String,
});

export const SquadGroupSummarySchema = Schema.Struct({
  characterCount: Schema.Number,
  groupId: SquadGroupIdSchema,
  name: Schema.String,
  squadCount: Schema.Number,
  updatedAt: Schema.Date,
});

export const GlobalSquadGroupSummarySchema = Schema.Struct({
  characterCount: Schema.Number,
  groupId: SquadGroupIdSchema,
  name: Schema.String,
  ownerUserId: AppUserIdSchema,
  ownerUserImage: Schema.NullOr(Schema.String),
  ownerUserName: Schema.String,
  squadCount: Schema.Number,
  updatedAt: Schema.Date,
});

export const ListGlobalSquadGroupsPayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  maxLevel: Schema.optional(Schema.NullOr(Schema.Number)),
  minLevel: Schema.optional(Schema.NullOr(Schema.Number)),
  nameQuery: Schema.optional(Schema.NullOr(Schema.String)),
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
  updatedAt: Schema.Date,
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
  squadId: Schema.optional(PositiveInt),
});

export const SaveSquadGroupPayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  groupId: SquadGroupIdSchema,
  name: Schema.String,
  squads: Schema.Array(SaveSquadPayload),
});

const SaveSharedSquadCharactersPayload = Schema.Struct({
  characters: Schema.Array(SquadCharacterPlacementPayload),
  squadId: PositiveInt,
});

export const SaveSharedSquadGroupCharactersPayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  groupId: SquadGroupIdSchema,
  squads: Schema.Array(SaveSharedSquadCharactersPayload),
});

export const SetSquadGroupVisibilityPayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  groupId: SquadGroupIdSchema,
  visibility: Schema.Literals(["private", "global"]),
});

export const SquadGroupVisibilityChangeSchema = Schema.Struct({
  groupId: SquadGroupIdSchema,
  updatedAt: Schema.Date,
  visibility: Schema.Literals(["private", "global"]),
});
