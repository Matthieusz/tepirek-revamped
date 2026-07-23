/* eslint-disable import/namespace, typescript/no-empty-interface, typescript/no-empty-object-type -- Schema record interfaces intentionally merge runtime schemas with their inferred types. */
import * as Schema from "effect/Schema";

import { MargonemAccountIdSchema } from "../../../domain/squad-builder/margonem-account-id.ts";
import {
  MargonemCharacterPreviewSchema,
  MargonemProfessionSchema,
} from "../../../domain/squad-builder/margonem-character.ts";
import { MargonemProfileIdSchema } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { PendingMargonemAccountRefetchIdSchema } from "../../../domain/squad-builder/pending-margonem-account-refetch-id.ts";
import { PositiveInt } from "../../../domain/squad-builder/positive-int.ts";

const StoredMargonemCharacterSnapshotSchema = Schema.Struct({
  affectedSquadCount: Schema.Finite,
  avatarUrl: Schema.NullOr(Schema.String),
  databaseCharacterId: Schema.Finite,
  level: PositiveInt,
  margonemCharacterId: PositiveInt,
  name: Schema.String,
  profession: MargonemProfessionSchema,
  world: Schema.String,
});
const MargonemCharacterFieldChangeSchema = Schema.Union([
  Schema.Struct({
    after: Schema.String,
    before: Schema.String,
    field: Schema.Literal("name"),
  }),
  Schema.Struct({
    after: PositiveInt,
    before: PositiveInt,
    field: Schema.Literal("level"),
  }),
  Schema.Struct({
    after: MargonemProfessionSchema,
    before: MargonemProfessionSchema,
    field: Schema.Literal("profession"),
  }),
  Schema.Struct({
    after: Schema.NullOr(Schema.String),
    before: Schema.NullOr(Schema.String),
    field: Schema.Literal("avatarUrl"),
  }),
]);
const AddedMargonemCharacterDiffSchema = Schema.TaggedStruct("AddedCharacter", {
  latest: MargonemCharacterPreviewSchema,
});
const RemovedMargonemCharacterDiffSchema = Schema.TaggedStruct(
  "RemovedCharacter",
  {
    current: StoredMargonemCharacterSnapshotSchema,
    reason: Schema.Literal("missingFromLatestJarunaProfile"),
  }
);
const ChangedMargonemCharacterDiffSchema = Schema.TaggedStruct(
  "ChangedCharacter",
  {
    changes: Schema.Array(MargonemCharacterFieldChangeSchema),
    current: StoredMargonemCharacterSnapshotSchema,
    databaseCharacterId: Schema.Finite,
    latest: MargonemCharacterPreviewSchema,
    margonemCharacterId: PositiveInt,
  }
);

export const MargonemAccountRefetchDiffSchema = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  added: Schema.Array(AddedMargonemCharacterDiffSchema),
  changed: Schema.Array(ChangedMargonemCharacterDiffSchema),
  fetchedAt: Schema.DateFromString,
  profileId: MargonemProfileIdSchema,
  removed: Schema.Array(RemovedMargonemCharacterDiffSchema),
  unchangedCount: Schema.Finite,
});
export interface MargonemAccountRefetchDiffSchema extends Schema.Schema.Type<
  typeof MargonemAccountRefetchDiffSchema
> {}

export const PreviewAccountRefetchPayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
});
export interface PreviewAccountRefetchPayload extends Schema.Schema.Type<
  typeof PreviewAccountRefetchPayload
> {}
export const PreviewAccountRefetchSuccess = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  diff: MargonemAccountRefetchDiffSchema,
  fetchedAt: Schema.DateFromString,
  firecrawlCreditsUsed: PositiveInt,
  generatedProfileUrl: Schema.String,
  profileId: MargonemProfileIdSchema,
  refetchPreviewId: PendingMargonemAccountRefetchIdSchema,
});
export interface PreviewAccountRefetchSuccess extends Schema.Schema.Type<
  typeof PreviewAccountRefetchSuccess
> {}

export const ApplyAccountRefetchPayload = Schema.Struct({
  refetchPreviewId: PendingMargonemAccountRefetchIdSchema,
});
export interface ApplyAccountRefetchPayload extends Schema.Schema.Type<
  typeof ApplyAccountRefetchPayload
> {}
export const ApplyAccountRefetchSuccess = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  addedCharacterCount: Schema.Finite,
  lastFetchedAt: Schema.DateFromString,
  profileId: MargonemProfileIdSchema,
  removedCharacterCount: Schema.Finite,
  removedSquadCharacterCount: Schema.Finite,
  updatedCharacterCount: Schema.Finite,
});
export interface ApplyAccountRefetchSuccess extends Schema.Schema.Type<
  typeof ApplyAccountRefetchSuccess
> {}
