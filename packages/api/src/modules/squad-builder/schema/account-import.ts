import * as Schema from "effect/Schema";

import {
  AppUserIdSchema,
  MargonemAccountIdSchema,
  MargonemCharacterPreviewSchema,
  MargonemProfileIdSchema,
  PendingMargonemAccountImportIdSchema,
  PositiveInt,
} from "./common.js";

export const PreviewMargonemProfileImportPayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  profileUrl: Schema.String,
});
export const PreviewMargonemProfileImportSuccess = Schema.Struct({
  firecrawlCreditsUsed: PositiveInt,
  generatedProfileUrl: Schema.String,
  jarunaCharacters: Schema.Array(MargonemCharacterPreviewSchema),
  lastFetchedAt: Schema.Date,
  profileId: MargonemProfileIdSchema,
  suggestedAccountName: Schema.String,
});

export const PreviewOwnedAccountImportsPayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  profileUrls: Schema.Array(Schema.String),
});
const PreviewOwnedAccountImportSucceeded = Schema.TaggedStruct(
  "PreviewSucceeded",
  {
    defaultDisplayName: Schema.String,
    firecrawlCreditsUsed: PositiveInt,
    generatedProfileUrl: Schema.String,
    inputUrl: Schema.String,
    jarunaCharacters: Schema.Array(MargonemCharacterPreviewSchema),
    lastFetchedAt: Schema.Date,
    lineNumber: PositiveInt,
    pendingImportId: PendingMargonemAccountImportIdSchema,
    profileId: MargonemProfileIdSchema,
    suggestedAccountName: Schema.String,
  }
);
const PreviewOwnedAccountImportLineError = Schema.Union([
  Schema.TaggedStruct("InvalidMargonemProfileUrl", {
    message: Schema.String,
  }),
  Schema.TaggedStruct("MissingMargonemProfileId", {
    message: Schema.String,
  }),
  Schema.TaggedStruct("DuplicateProfileInBatch", {
    firstLineNumber: PositiveInt,
  }),
  Schema.TaggedStruct("MargonemAccountAlreadyOwnedByActor", {}),
  Schema.TaggedStruct("MargonemAccountOwnedByAnotherUser", {}),
  Schema.TaggedStruct("MargonemAccountAlreadySharedWithActor", {}),
  Schema.TaggedStruct("FirecrawlMonthlyBudgetExhausted", {
    monthlyRequestBudget: Schema.Number,
    usedRequests: Schema.Number,
    yearMonth: Schema.String,
  }),
  Schema.TaggedStruct("FirecrawlRequestFailed", {
    cause: Schema.Defect(),
    profileId: PositiveInt,
  }),
  Schema.TaggedStruct("FirecrawlResponseNotParseable", {
    cause: Schema.Defect(),
    profileId: PositiveInt,
  }),
  Schema.TaggedStruct("RequestCancelled", {
    cause: Schema.Defect(),
    profileId: PositiveInt,
  }),
  Schema.TaggedStruct("MargonemProfileNameNotFound", {
    profileId: MargonemProfileIdSchema,
  }),
  Schema.TaggedStruct("MargonemCharacterRowsNotFound", {
    profileId: MargonemProfileIdSchema,
  }),
  Schema.TaggedStruct("MargonemCharacterRowInvalid", {
    profileId: MargonemProfileIdSchema,
    safeReason: Schema.String,
  }),
  Schema.TaggedStruct("SquadBuilderPersistenceUnavailable", {
    cause: Schema.Defect(),
    operation: Schema.String,
  }),
]);
const PreviewOwnedAccountImportFailed = Schema.TaggedStruct("PreviewFailed", {
  error: PreviewOwnedAccountImportLineError,
  inputUrl: Schema.String,
  lineNumber: PositiveInt,
});
export const PreviewOwnedAccountImportsSuccess = Schema.Struct({
  items: Schema.Array(
    Schema.Union([
      PreviewOwnedAccountImportSucceeded,
      PreviewOwnedAccountImportFailed,
    ])
  ),
});

export const ConfirmOwnedAccountImportPayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  displayName: Schema.String,
  pendingImportId: PendingMargonemAccountImportIdSchema,
});
export const OwnedMargonemAccountSummarySchema = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  characterCount: Schema.Number,
  displayName: Schema.String,
  generatedProfileUrl: Schema.String,
  lastFetchedAt: Schema.Date,
  profileId: MargonemProfileIdSchema,
});
