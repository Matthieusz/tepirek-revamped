/* eslint-disable max-classes-per-file -- Domain error schemas are intentionally collocated for HttpApi/OpenApi error unions. */
import * as Schema from "effect/Schema";

import { FirecrawlYearMonth } from "../../../domain/squad-builder/firecrawl-year-month.ts";

const InvitationStatusSchema = Schema.Literals([
  "pending",
  "accepted",
  "declined",
  "revoked",
]);

export class SquadGroupNotFound extends Schema.TaggedErrorClass<SquadGroupNotFound>()(
  "SquadGroupNotFound",
  {}
) {}

export class ActorDoesNotOwnSquadGroup extends Schema.TaggedErrorClass<ActorDoesNotOwnSquadGroup>()(
  "ActorDoesNotOwnSquadGroup",
  {}
) {}

export class ActorCannotViewSquadGroup extends Schema.TaggedErrorClass<ActorCannotViewSquadGroup>()(
  "ActorCannotViewSquadGroup",
  {}
) {}

export class ActorCannotEditSquadGroup extends Schema.TaggedErrorClass<ActorCannotEditSquadGroup>()(
  "ActorCannotEditSquadGroup",
  {}
) {}

export class CannotInviteSelf extends Schema.TaggedErrorClass<CannotInviteSelf>()(
  "CannotInviteSelf",
  {}
) {}

export class SquadEditorInviteTargetNotFound extends Schema.TaggedErrorClass<SquadEditorInviteTargetNotFound>()(
  "SquadEditorInviteTargetNotFound",
  {}
) {}

export class SquadEditorInviteTargetNotVerified extends Schema.TaggedErrorClass<SquadEditorInviteTargetNotVerified>()(
  "SquadEditorInviteTargetNotVerified",
  {}
) {}

export class SquadGroupInvitationNotFound extends Schema.TaggedErrorClass<SquadGroupInvitationNotFound>()(
  "SquadGroupInvitationNotFound",
  {}
) {}

export class ActorIsNotSquadGroupInviteRecipient extends Schema.TaggedErrorClass<ActorIsNotSquadGroupInviteRecipient>()(
  "ActorIsNotSquadGroupInviteRecipient",
  {}
) {}

export class SquadGroupInvitationTransitionNotAllowed extends Schema.TaggedErrorClass<SquadGroupInvitationTransitionNotAllowed>()(
  "SquadGroupInvitationTransitionNotAllowed",
  {
    attempted: Schema.String,
    currentStatus: InvitationStatusSchema,
  }
) {}

export class SquadGroupWriteConflict extends Schema.TaggedErrorClass<SquadGroupWriteConflict>()(
  "SquadGroupWriteConflict",
  {}
) {}

export class SquadNotInGroup extends Schema.TaggedErrorClass<SquadNotInGroup>()(
  "SquadNotInGroup",
  {
    squadId: Schema.Finite,
  }
) {}

export class EditorCannotChangeSquadStructure extends Schema.TaggedErrorClass<EditorCannotChangeSquadStructure>()(
  "EditorCannotChangeSquadStructure",
  {}
) {}

export class MargonemAccountNotFound extends Schema.TaggedErrorClass<MargonemAccountNotFound>()(
  "MargonemAccountNotFound",
  {}
) {}

export class ActorDoesNotOwnMargonemAccount extends Schema.TaggedErrorClass<ActorDoesNotOwnMargonemAccount>()(
  "ActorDoesNotOwnMargonemAccount",
  {}
) {}

export class InviteTargetNotFound extends Schema.TaggedErrorClass<InviteTargetNotFound>()(
  "InviteTargetNotFound",
  {}
) {}

export class InviteTargetNotVerified extends Schema.TaggedErrorClass<InviteTargetNotVerified>()(
  "InviteTargetNotVerified",
  {}
) {}

export class AccountAccessInviteNotFound extends Schema.TaggedErrorClass<AccountAccessInviteNotFound>()(
  "AccountAccessInviteNotFound",
  {}
) {}

export class ActorIsNotInviteRecipient extends Schema.TaggedErrorClass<ActorIsNotInviteRecipient>()(
  "ActorIsNotInviteRecipient",
  {}
) {}

export class AccountAccessTransitionNotAllowed extends Schema.TaggedErrorClass<AccountAccessTransitionNotAllowed>()(
  "AccountAccessTransitionNotAllowed",
  {
    attempted: Schema.String,
    currentStatus: InvitationStatusSchema,
  }
) {}

export class PendingMargonemAccountImportNotFound extends Schema.TaggedErrorClass<PendingMargonemAccountImportNotFound>()(
  "PendingMargonemAccountImportNotFound",
  {}
) {}

export class PendingMargonemAccountRefetchNotFound extends Schema.TaggedErrorClass<PendingMargonemAccountRefetchNotFound>()(
  "PendingMargonemAccountRefetchNotFound",
  {}
) {}

export class FirecrawlMonthlyBudgetExhausted extends Schema.TaggedErrorClass<FirecrawlMonthlyBudgetExhausted>()(
  "FirecrawlMonthlyBudgetExhausted",
  {
    monthlyRequestBudget: Schema.Finite,
    usedRequests: Schema.Finite,
    yearMonth: FirecrawlYearMonth,
  }
) {}

export class FirecrawlUserMonthlyBudgetExhausted extends Schema.TaggedErrorClass<FirecrawlUserMonthlyBudgetExhausted>()(
  "FirecrawlUserMonthlyBudgetExhausted",
  {
    monthlyRequestBudget: Schema.Finite,
    usedRequests: Schema.Finite,
    yearMonth: FirecrawlYearMonth,
  }
) {}

export class MargonemAccountAlreadyOwnedByActor extends Schema.TaggedErrorClass<MargonemAccountAlreadyOwnedByActor>()(
  "MargonemAccountAlreadyOwnedByActor",
  {}
) {}

export class MargonemAccountOwnedByAnotherUser extends Schema.TaggedErrorClass<MargonemAccountOwnedByAnotherUser>()(
  "MargonemAccountOwnedByAnotherUser",
  {}
) {}

export class MargonemAccountAlreadySharedWithActor extends Schema.TaggedErrorClass<MargonemAccountAlreadySharedWithActor>()(
  "MargonemAccountAlreadySharedWithActor",
  {}
) {}

const SquadBuilderPersistenceOperationSchema = Schema.Literals([
  "applyPendingRefetch",
  "authorizeSquadGroupOwner",
  "createSquadGroup",
  "confirmPendingImport",
  "deleteOwnedAccount",
  "createPendingImport",
  "createPendingRefetch",
  "findAccountOwnerUserId",
  "findVerifiedInviteTarget",
  "findVerifiedSquadEditorInviteTarget",
  "findProfileAccessState",
  "getAccountForRefetch",
  "getPendingSquadGroupInviteCount",
  "getSquadGroupDetail",
  "listAvailableCharactersForOwner",
  "listAccountAccessGrants",
  "listGlobalSquadGroups",
  "listIncomingAccountInvites",
  "listIncomingSquadGroupInvites",
  "listMySquadGroups",
  "listOwnedAccounts",
  "listSharedAccounts",
  "listSharedSquadGroups",
  "listSquadGroupEditorGrants",
  "markRequestFailed",
  "markRequestSucceeded",
  "reserveRequest",
  "respondToAccountAccessInvite",
  "respondToSquadGroupInvite",
  "revokeAccountAccess",
  "revokeSquadGroupEditor",
  "deleteSquadGroup",
  "saveSharedSquadGroupCharacters",
  "saveSquadGroupSnapshot",
  "searchSquadEditorInviteTargets",
  "searchInviteTargets",
  "setSquadGroupVisibility",
  "updateOwnedAccountDisplayName",
  "upsertAccountAccessInvite",
  "upsertSquadGroupEditorInvite",
]);

export type SquadBuilderPersistenceOperation =
  typeof SquadBuilderPersistenceOperationSchema.Type;

export class SquadBuilderPersistenceUnavailable extends Schema.TaggedErrorClass<SquadBuilderPersistenceUnavailable>()(
  "SquadBuilderPersistenceUnavailable",
  {
    cause: Schema.Defect(),
    operation: SquadBuilderPersistenceOperationSchema,
    provider: Schema.Literal("postgres"),
  }
) {}
