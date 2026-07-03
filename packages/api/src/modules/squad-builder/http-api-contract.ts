import * as Schema from "effect/Schema";
/* eslint-disable max-lines -- The squad-builder HttpApi contract intentionally collocates the migrated endpoint schemas. */
/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
} from "effect/unstable/httpapi";

const PositiveInt = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 1 })
);

export const AppUserIdSchema = Schema.NonEmptyString.annotate({
  identifier: "AppUserId",
});
export const MargonemAccountIdSchema = PositiveInt.annotate({
  identifier: "MargonemAccountId",
});
export const MargonemAccountAccessIdSchema = PositiveInt.annotate({
  identifier: "MargonemAccountAccessId",
});
export const MargonemProfileIdSchema = PositiveInt.annotate({
  identifier: "MargonemProfileId",
});
export const PendingMargonemAccountImportIdSchema = PositiveInt.annotate({
  identifier: "PendingMargonemAccountImportId",
});
export const PendingMargonemAccountRefetchIdSchema = PositiveInt.annotate({
  identifier: "PendingMargonemAccountRefetchId",
});
export const SquadGroupIdSchema = PositiveInt.annotate({
  identifier: "SquadGroupId",
});
export const SquadGroupInvitationIdSchema = PositiveInt.annotate({
  identifier: "SquadGroupInvitationId",
});

const AccountAccessStatusSchema = Schema.Literals([
  "pending",
  "accepted",
  "declined",
  "revoked",
]);
const ActiveAccountAccessStatusSchema = Schema.Literals([
  "pending",
  "accepted",
]);
const SquadGroupInvitationStatusSchema = Schema.Literals([
  "pending",
  "accepted",
  "declined",
  "revoked",
]);
const ActiveSquadGroupInvitationStatusSchema = Schema.Literals([
  "pending",
  "accepted",
]);
const InviteResponseSchema = Schema.Literals(["accept", "decline"]);
const MargonemProfessionSchema = Schema.Literals([
  "warrior",
  "paladin",
  "bladeDancer",
  "mage",
  "hunter",
  "tracker",
]);

export const MargonemCharacterPreviewSchema = Schema.Struct({
  avatarUrl: Schema.NullOr(Schema.String),
  characterId: PositiveInt,
  level: PositiveInt,
  name: Schema.String,
  profession: MargonemProfessionSchema,
  world: Schema.String,
});

const MargonemAccountRefetchDiffSchema = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  added: Schema.Array(Schema.TaggedStruct("AddedCharacter", {})),
  changed: Schema.Array(Schema.TaggedStruct("ChangedCharacter", {})),
  fetchedAt: Schema.Date,
  profileId: MargonemProfileIdSchema,
  removed: Schema.Array(Schema.TaggedStruct("RemovedCharacter", {})),
  unchangedCount: Schema.Number,
});

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

export const PreviewAccountRefetchPayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  actorUserId: AppUserIdSchema,
});
export const PreviewAccountRefetchSuccess = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  diff: MargonemAccountRefetchDiffSchema,
  fetchedAt: Schema.Date,
  firecrawlCreditsUsed: PositiveInt,
  generatedProfileUrl: Schema.String,
  profileId: MargonemProfileIdSchema,
  refetchPreviewId: PendingMargonemAccountRefetchIdSchema,
});

export const ApplyAccountRefetchPayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  refetchPreviewId: PendingMargonemAccountRefetchIdSchema,
});
export const ApplyAccountRefetchSuccess = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  addedCharacterCount: Schema.Number,
  lastFetchedAt: Schema.Date,
  profileId: MargonemProfileIdSchema,
  removedCharacterCount: Schema.Number,
  removedSquadCharacterCount: Schema.Number,
  updatedCharacterCount: Schema.Number,
});

export const AccountInviteTargetSchema = Schema.Struct({
  image: Schema.NullOr(Schema.String),
  name: Schema.String,
  userId: AppUserIdSchema,
});
export const SearchAccountInviteTargetsPayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  actorUserId: AppUserIdSchema,
  query: Schema.String,
});
export const SendAccountAccessInvitePayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  actorUserId: AppUserIdSchema,
  invitedUserId: AppUserIdSchema,
});
export const AccountAccessInviteSummarySchema = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
  accountDisplayName: Schema.String,
  accountId: MargonemAccountIdSchema,
  createdAt: Schema.Date,
  generatedProfileUrl: Schema.String,
  invitedUserId: AppUserIdSchema,
  ownerUserId: AppUserIdSchema,
  ownerUserImage: Schema.NullOr(Schema.String),
  ownerUserName: Schema.String,
  status: AccountAccessStatusSchema,
  updatedAt: Schema.Date,
});
export const RespondToAccountAccessInvitePayload = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
  actorUserId: AppUserIdSchema,
  response: InviteResponseSchema,
});
export const RevokeAccountAccessPayload = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
  actorUserId: AppUserIdSchema,
});
export const RevokeAccountAccessSuccess = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
  accountId: MargonemAccountIdSchema,
  removedSquadCharacterCount: Schema.Number,
  revokedUserId: AppUserIdSchema,
});
export const ActorPayload = Schema.Struct({ actorUserId: AppUserIdSchema });
export const AccountAccessGrantsPayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  actorUserId: AppUserIdSchema,
});
export const SharedMargonemAccountSummarySchema = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  characterCount: Schema.Number,
  displayName: Schema.String,
  generatedProfileUrl: Schema.String,
  lastFetchedAt: Schema.Date,
  ownerUserId: AppUserIdSchema,
  ownerUserImage: Schema.NullOr(Schema.String),
  ownerUserName: Schema.String,
  profileId: MargonemProfileIdSchema,
});
export const AccountAccessGrantSummarySchema = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
  createdAt: Schema.Date,
  invitedUserId: AppUserIdSchema,
  invitedUserImage: Schema.NullOr(Schema.String),
  invitedUserName: Schema.String,
  status: ActiveAccountAccessStatusSchema,
  updatedAt: Schema.Date,
});

export const SquadEditorInviteTargetSchema = AccountInviteTargetSchema;
export const SearchSquadEditorInviteTargetsPayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  groupId: SquadGroupIdSchema,
  query: Schema.String,
});
export const SendSquadGroupEditorInvitePayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  groupId: SquadGroupIdSchema,
  invitedUserId: AppUserIdSchema,
});
export const SquadGroupInvitationSummarySchema = Schema.Struct({
  createdAt: Schema.Date,
  invitationId: SquadGroupInvitationIdSchema,
  ownerUserId: AppUserIdSchema,
  ownerUserImage: Schema.NullOr(Schema.String),
  ownerUserName: Schema.String,
  squadGroupId: SquadGroupIdSchema,
  squadGroupName: Schema.String,
  status: SquadGroupInvitationStatusSchema,
  updatedAt: Schema.Date,
});
export const RespondToSquadGroupInvitePayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  invitationId: SquadGroupInvitationIdSchema,
  response: InviteResponseSchema,
});
export const RevokeSquadGroupEditorPayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  invitationId: SquadGroupInvitationIdSchema,
});
export const SquadGroupEditorGrantsPayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  groupId: SquadGroupIdSchema,
});
export const SharedSquadGroupSummarySchema = Schema.Struct({
  characterCount: Schema.Number,
  groupId: SquadGroupIdSchema,
  name: Schema.String,
  ownerUserId: AppUserIdSchema,
  ownerUserImage: Schema.NullOr(Schema.String),
  ownerUserName: Schema.String,
  squadCount: Schema.Number,
  updatedAt: Schema.Date,
});
export const SquadGroupEditorGrantSummarySchema = Schema.Struct({
  createdAt: Schema.Date,
  invitationId: SquadGroupInvitationIdSchema,
  status: ActiveSquadGroupInvitationStatusSchema,
  updatedAt: Schema.Date,
  userId: AppUserIdSchema,
  userImage: Schema.NullOr(Schema.String),
  userName: Schema.String,
});

const SquadBuilderServiceError = Schema.Struct({ _tag: Schema.String });

export const SquadBuilderAccountImportGroup = HttpApiGroup.make(
  "squadBuilderAccountImport"
)
  .add(
    HttpApiEndpoint.post("previewMargonemProfileImport", "/preview-profile", {
      error: SquadBuilderServiceError,
      payload: PreviewMargonemProfileImportPayload,
      success: PreviewMargonemProfileImportSuccess,
    }),
    HttpApiEndpoint.post("previewOwnedAccountImports", "/preview-owned", {
      error: SquadBuilderServiceError,
      payload: PreviewOwnedAccountImportsPayload,
      success: PreviewOwnedAccountImportsSuccess,
    }),
    HttpApiEndpoint.post("confirmOwnedAccountImport", "/confirm-owned", {
      error: SquadBuilderServiceError,
      payload: ConfirmOwnedAccountImportPayload,
      success: OwnedMargonemAccountSummarySchema,
    })
  )
  .prefix("/squad-builder/account-imports");

export const SquadBuilderAccountRefetchGroup = HttpApiGroup.make(
  "squadBuilderAccountRefetch"
)
  .add(
    HttpApiEndpoint.post("previewAccountRefetch", "/preview", {
      error: SquadBuilderServiceError,
      payload: PreviewAccountRefetchPayload,
      success: PreviewAccountRefetchSuccess,
    }),
    HttpApiEndpoint.post("applyAccountRefetch", "/apply", {
      error: SquadBuilderServiceError,
      payload: ApplyAccountRefetchPayload,
      success: ApplyAccountRefetchSuccess,
    })
  )
  .prefix("/squad-builder/account-refetches");

export const SquadBuilderAccountSharingGroup = HttpApiGroup.make(
  "squadBuilderAccountSharing"
)
  .add(
    HttpApiEndpoint.post(
      "searchAccountInviteTargets",
      "/invite-targets/search",
      {
        error: SquadBuilderServiceError,
        payload: SearchAccountInviteTargetsPayload,
        success: Schema.Array(AccountInviteTargetSchema),
      }
    ),
    HttpApiEndpoint.post("sendAccountAccessInvite", "/invites", {
      error: SquadBuilderServiceError,
      payload: SendAccountAccessInvitePayload,
      success: AccountAccessInviteSummarySchema,
    }),
    HttpApiEndpoint.post("respondToAccountAccessInvite", "/invites/respond", {
      error: SquadBuilderServiceError,
      payload: RespondToAccountAccessInvitePayload,
      success: AccountAccessInviteSummarySchema,
    }),
    HttpApiEndpoint.post("revokeAccountAccess", "/access/revoke", {
      error: SquadBuilderServiceError,
      payload: RevokeAccountAccessPayload,
      success: RevokeAccountAccessSuccess,
    }),
    HttpApiEndpoint.post("listIncomingAccountInvites", "/incoming-invites", {
      error: SquadBuilderServiceError,
      payload: ActorPayload,
      success: Schema.Array(AccountAccessInviteSummarySchema),
    }),
    HttpApiEndpoint.post("listSharedAccounts", "/shared-accounts", {
      error: SquadBuilderServiceError,
      payload: ActorPayload,
      success: Schema.Array(SharedMargonemAccountSummarySchema),
    }),
    HttpApiEndpoint.post("listAccountAccessGrants", "/access-grants", {
      error: SquadBuilderServiceError,
      payload: AccountAccessGrantsPayload,
      success: Schema.Array(AccountAccessGrantSummarySchema),
    })
  )
  .prefix("/squad-builder/account-sharing");

export const SquadBuilderSquadGroupSharingGroup = HttpApiGroup.make(
  "squadBuilderSquadGroupSharing"
)
  .add(
    HttpApiEndpoint.post(
      "searchSquadEditorInviteTargets",
      "/editor-targets/search",
      {
        error: SquadBuilderServiceError,
        payload: SearchSquadEditorInviteTargetsPayload,
        success: Schema.Array(SquadEditorInviteTargetSchema),
      }
    ),
    HttpApiEndpoint.post("sendSquadGroupEditorInvite", "/editor-invites", {
      error: SquadBuilderServiceError,
      payload: SendSquadGroupEditorInvitePayload,
      success: SquadGroupInvitationSummarySchema,
    }),
    HttpApiEndpoint.post(
      "respondToSquadGroupInvite",
      "/editor-invites/respond",
      {
        error: SquadBuilderServiceError,
        payload: RespondToSquadGroupInvitePayload,
        success: SquadGroupInvitationSummarySchema,
      }
    ),
    HttpApiEndpoint.post("revokeSquadGroupEditor", "/editors/revoke", {
      error: SquadBuilderServiceError,
      payload: RevokeSquadGroupEditorPayload,
      success: SquadGroupInvitationSummarySchema,
    }),
    HttpApiEndpoint.post("listIncomingSquadGroupInvites", "/incoming-invites", {
      error: SquadBuilderServiceError,
      payload: ActorPayload,
      success: Schema.Array(SquadGroupInvitationSummarySchema),
    }),
    HttpApiEndpoint.post("listSharedSquadGroups", "/shared-groups", {
      error: SquadBuilderServiceError,
      payload: ActorPayload,
      success: Schema.Array(SharedSquadGroupSummarySchema),
    }),
    HttpApiEndpoint.post("listSquadGroupEditorGrants", "/editor-grants", {
      error: SquadBuilderServiceError,
      payload: SquadGroupEditorGrantsPayload,
      success: Schema.Array(SquadGroupEditorGrantSummarySchema),
    }),
    HttpApiEndpoint.post(
      "countPendingSquadGroupInvites",
      "/pending-invite-count",
      {
        error: SquadBuilderServiceError,
        payload: ActorPayload,
        success: Schema.Number,
      }
    )
  )
  .prefix("/squad-builder/squad-group-sharing");

export const SquadBuilderHttpApi = HttpApi.make("squadBuilder")
  .add(SquadBuilderAccountImportGroup)
  .add(SquadBuilderAccountRefetchGroup)
  .add(SquadBuilderAccountSharingGroup)
  .add(SquadBuilderSquadGroupSharingGroup);

export type SquadBuilderHttpApi = typeof SquadBuilderHttpApi;
