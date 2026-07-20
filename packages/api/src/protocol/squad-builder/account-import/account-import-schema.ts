import * as Schema from "effect/Schema";

import { MargonemAccountIdSchema } from "../../../domain/squad-builder/margonem-account-id.ts";
import { MargonemCharacterPreviewSchema } from "../../../domain/squad-builder/margonem-character.ts";
import { MargonemProfileIdSchema } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { PendingMargonemAccountImportIdSchema } from "../../../domain/squad-builder/pending-margonem-account-import-id.ts";
import { PositiveInt } from "../../../domain/squad-builder/positive-int.ts";

export const PreviewMargonemProfileImportPayload = Schema.Struct({
  profileUrl: Schema.String,
});
export const PreviewMargonemProfileImportSuccess = Schema.Struct({
  firecrawlCreditsUsed: PositiveInt,
  generatedProfileUrl: Schema.String,
  jarunaCharacters: Schema.Array(MargonemCharacterPreviewSchema),
  lastFetchedAt: Schema.DateFromString,
  profileId: MargonemProfileIdSchema,
  suggestedAccountName: Schema.String,
});

export const PreviewOwnedAccountImportsPayload = Schema.Struct({
  profileUrls: Schema.Array(Schema.String),
});
const PreviewOwnedAccountImportLineError = Schema.TaggedUnion({
  DuplicateProfileInBatch: { firstLineNumber: PositiveInt },
  FirecrawlMonthlyBudgetExhausted: {
    monthlyRequestBudget: Schema.Number,
    usedRequests: Schema.Number,
    yearMonth: Schema.String,
  },
  FirecrawlRequestFailed: { profileId: PositiveInt },
  FirecrawlResponseNotParseable: { profileId: PositiveInt },
  InvalidMargonemProfileUrl: { message: Schema.String },
  MargonemAccountAlreadyOwnedByActor: {},
  MargonemAccountAlreadySharedWithActor: {},
  MargonemAccountOwnedByAnotherUser: {},
  MargonemCharacterRowInvalid: {
    profileId: MargonemProfileIdSchema,
    safeReason: Schema.String,
  },
  MargonemCharacterRowsNotFound: { profileId: MargonemProfileIdSchema },
  MargonemProfileNameNotFound: { profileId: MargonemProfileIdSchema },
  MissingMargonemProfileId: { message: Schema.String },
  SquadBuilderPersistenceUnavailable: { operation: Schema.String },
});
const PreviewOwnedAccountImportItem = Schema.TaggedUnion({
  PreviewFailed: {
    error: PreviewOwnedAccountImportLineError,
    inputUrl: Schema.String,
    lineNumber: PositiveInt,
  },
  PreviewSucceeded: {
    defaultDisplayName: Schema.String,
    firecrawlCreditsUsed: PositiveInt,
    generatedProfileUrl: Schema.String,
    inputUrl: Schema.String,
    jarunaCharacters: Schema.Array(MargonemCharacterPreviewSchema),
    lastFetchedAt: Schema.DateFromString,
    lineNumber: PositiveInt,
    pendingImportId: PendingMargonemAccountImportIdSchema,
    profileId: MargonemProfileIdSchema,
    suggestedAccountName: Schema.String,
  },
});
export const PreviewOwnedAccountImportsSuccess = Schema.Struct({
  items: Schema.Array(PreviewOwnedAccountImportItem),
});

export const ConfirmOwnedAccountImportPayload = Schema.Struct({
  displayName: Schema.String,
  pendingImportId: PendingMargonemAccountImportIdSchema,
});
export const UpdateOwnedAccountDisplayNamePayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  displayName: Schema.String,
});
export const DeleteOwnedAccountPayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
});
export const DeleteOwnedAccountSuccess = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  removedAccessGrantCount: Schema.Number,
  removedCharacterCount: Schema.Number,
  removedSquadCharacterCount: Schema.Number,
});
export const OwnedAccountCharacterPreviewSchema = Schema.Struct({
  avatarUrl: Schema.NullOr(Schema.String),
  characterId: Schema.Number,
  name: Schema.String,
  profession: Schema.String,
});

export const OwnedMargonemAccountSummarySchema = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  characterCount: Schema.Number,
  characterPreviews: Schema.Array(OwnedAccountCharacterPreviewSchema),
  displayName: Schema.String,
  generatedProfileUrl: Schema.String,
  lastFetchedAt: Schema.DateFromString,
  profileId: MargonemProfileIdSchema,
});
