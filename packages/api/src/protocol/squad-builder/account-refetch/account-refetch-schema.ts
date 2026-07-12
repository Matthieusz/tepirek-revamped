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
  affectedSquadCount: Schema.Number,
  avatarUrl: Schema.NullOr(Schema.String),
  databaseCharacterId: Schema.Number,
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
    databaseCharacterId: Schema.Number,
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
  unchangedCount: Schema.Number,
});

export const PreviewAccountRefetchPayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
});
export const PreviewAccountRefetchSuccess = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  diff: MargonemAccountRefetchDiffSchema,
  fetchedAt: Schema.DateFromString,
  firecrawlCreditsUsed: PositiveInt,
  generatedProfileUrl: Schema.String,
  profileId: MargonemProfileIdSchema,
  refetchPreviewId: PendingMargonemAccountRefetchIdSchema,
});

export const ApplyAccountRefetchPayload = Schema.Struct({
  refetchPreviewId: PendingMargonemAccountRefetchIdSchema,
});
export const ApplyAccountRefetchSuccess = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  addedCharacterCount: Schema.Number,
  lastFetchedAt: Schema.DateFromString,
  profileId: MargonemProfileIdSchema,
  removedCharacterCount: Schema.Number,
  removedSquadCharacterCount: Schema.Number,
  updatedCharacterCount: Schema.Number,
});
