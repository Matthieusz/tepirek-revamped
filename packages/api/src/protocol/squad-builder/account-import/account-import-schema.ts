/* eslint-disable import/namespace, typescript/no-empty-interface, typescript/no-empty-object-type -- Schema record interfaces intentionally merge runtime schemas with their inferred types. */
import * as Schema from "effect/Schema";

import { MargonemAccountIdSchema } from "../../../domain/squad-builder/margonem-account-id.ts";
import { MargonemCharacterPreviewSchema } from "../../../domain/squad-builder/margonem-character.ts";
import { MargonemProfileIdSchema } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { PendingMargonemAccountImportIdSchema } from "../../../domain/squad-builder/pending-margonem-account-import-id.ts";
import { PositiveInt } from "../../../domain/squad-builder/positive-int.ts";

export const PreviewMargonemProfileImportPayload = Schema.Struct({
  profileUrl: Schema.String,
});
export interface PreviewMargonemProfileImportPayload extends Schema.Schema.Type<
  typeof PreviewMargonemProfileImportPayload
> {}
export const PreviewMargonemProfileImportSuccess = Schema.Struct({
  firecrawlCreditsUsed: PositiveInt,
  generatedProfileUrl: Schema.String,
  jarunaCharacters: Schema.Array(MargonemCharacterPreviewSchema),
  lastFetchedAt: Schema.DateFromString,
  profileId: MargonemProfileIdSchema,
  suggestedAccountName: Schema.String,
});
export interface PreviewMargonemProfileImportSuccess extends Schema.Schema.Type<
  typeof PreviewMargonemProfileImportSuccess
> {}

export const PreviewOwnedAccountImportsPayload = Schema.Struct({
  profileUrls: Schema.Array(Schema.String),
});
export interface PreviewOwnedAccountImportsPayload extends Schema.Schema.Type<
  typeof PreviewOwnedAccountImportsPayload
> {}
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
export interface PreviewOwnedAccountImportsSuccess extends Schema.Schema.Type<
  typeof PreviewOwnedAccountImportsSuccess
> {}

export const ConfirmOwnedAccountImportPayload = Schema.Struct({
  displayName: Schema.String,
  pendingImportId: PendingMargonemAccountImportIdSchema,
});
export interface ConfirmOwnedAccountImportPayload extends Schema.Schema.Type<
  typeof ConfirmOwnedAccountImportPayload
> {}
export const UpdateOwnedAccountDisplayNamePayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  displayName: Schema.String,
});
export interface UpdateOwnedAccountDisplayNamePayload extends Schema.Schema
  .Type<typeof UpdateOwnedAccountDisplayNamePayload> {}
export const DeleteOwnedAccountPayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
});
export interface DeleteOwnedAccountPayload extends Schema.Schema.Type<
  typeof DeleteOwnedAccountPayload
> {}
export const DeleteOwnedAccountSuccess = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  removedAccessGrantCount: Schema.Number,
  removedCharacterCount: Schema.Number,
  removedSquadCharacterCount: Schema.Number,
});
export interface DeleteOwnedAccountSuccess extends Schema.Schema.Type<
  typeof DeleteOwnedAccountSuccess
> {}
export const OwnedAccountCharacterPreviewSchema = Schema.Struct({
  avatarUrl: Schema.NullOr(Schema.String),
  characterId: Schema.Number,
  name: Schema.String,
  profession: Schema.String,
});
export interface OwnedAccountCharacterPreviewSchema extends Schema.Schema.Type<
  typeof OwnedAccountCharacterPreviewSchema
> {}

export const OwnedMargonemAccountSummarySchema = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  characterCount: Schema.Number,
  characterPreviews: Schema.Array(OwnedAccountCharacterPreviewSchema),
  displayName: Schema.String,
  generatedProfileUrl: Schema.String,
  lastFetchedAt: Schema.DateFromString,
  profileId: MargonemProfileIdSchema,
});
export interface OwnedMargonemAccountSummarySchema extends Schema.Schema.Type<
  typeof OwnedMargonemAccountSummarySchema
> {}
