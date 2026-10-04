/* eslint-disable max-classes-per-file -- Domain error schemas are intentionally collocated for HttpApi/OpenApi error unions. */
import * as Schema from "effect/Schema";

import { FirecrawlYearMonth } from "../../../domain/squad-builder/firecrawl-year-month.ts";

const InvitationStatusSchema = Schema.Literals([
  "pending",
  "accepted",
  "declined",
  "revoked",
]);

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadGroupNotFound extends Schema.TaggedError<SquadGroupNotFound>()(
  "SquadGroupNotFound",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class ActorDoesNotOwnSquadGroup extends Schema.TaggedError<ActorDoesNotOwnSquadGroup>()(
  "ActorDoesNotOwnSquadGroup",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class ActorCannotViewSquadGroup extends Schema.TaggedError<ActorCannotViewSquadGroup>()(
  "ActorCannotViewSquadGroup",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class ActorCannotEditSquadGroup extends Schema.TaggedError<ActorCannotEditSquadGroup>()(
  "ActorCannotEditSquadGroup",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class CannotInviteSelf extends Schema.TaggedError<CannotInviteSelf>()(
  "CannotInviteSelf",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadEditorInviteTargetNotFound extends Schema.TaggedError<SquadEditorInviteTargetNotFound>()(
  "SquadEditorInviteTargetNotFound",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadEditorInviteTargetNotVerified extends Schema.TaggedError<SquadEditorInviteTargetNotVerified>()(
  "SquadEditorInviteTargetNotVerified",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadGroupInvitationNotFound extends Schema.TaggedError<SquadGroupInvitationNotFound>()(
  "SquadGroupInvitationNotFound",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class ActorIsNotSquadGroupInviteRecipient extends Schema.TaggedError<ActorIsNotSquadGroupInviteRecipient>()(
  "ActorIsNotSquadGroupInviteRecipient",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadGroupInvitationTransitionNotAllowed extends Schema.TaggedError<SquadGroupInvitationTransitionNotAllowed>()(
  "SquadGroupInvitationTransitionNotAllowed",
  {
    attempted: Schema.String,
    currentStatus: InvitationStatusSchema,
  }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadGroupWriteConflict extends Schema.TaggedError<SquadGroupWriteConflict>()(
  "SquadGroupWriteConflict",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadNotInGroup extends Schema.TaggedError<SquadNotInGroup>()(
  "SquadNotInGroup",
  {
    squadId: Schema.Finite,
  }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class EditorCannotChangeSquadStructure extends Schema.TaggedError<EditorCannotChangeSquadStructure>()(
  "EditorCannotChangeSquadStructure",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class MargonemAccountNotFound extends Schema.TaggedError<MargonemAccountNotFound>()(
  "MargonemAccountNotFound",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class ActorDoesNotOwnMargonemAccount extends Schema.TaggedError<ActorDoesNotOwnMargonemAccount>()(
  "ActorDoesNotOwnMargonemAccount",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class InviteTargetNotFound extends Schema.TaggedError<InviteTargetNotFound>()(
  "InviteTargetNotFound",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class InviteTargetNotVerified extends Schema.TaggedError<InviteTargetNotVerified>()(
  "InviteTargetNotVerified",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class AccountAccessInviteNotFound extends Schema.TaggedError<AccountAccessInviteNotFound>()(
  "AccountAccessInviteNotFound",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class ActorIsNotInviteRecipient extends Schema.TaggedError<ActorIsNotInviteRecipient>()(
  "ActorIsNotInviteRecipient",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class AccountAccessTransitionNotAllowed extends Schema.TaggedError<AccountAccessTransitionNotAllowed>()(
  "AccountAccessTransitionNotAllowed",
  {
    attempted: Schema.String,
    currentStatus: InvitationStatusSchema,
  }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class PendingMargonemAccountImportNotFound extends Schema.TaggedError<PendingMargonemAccountImportNotFound>()(
  "PendingMargonemAccountImportNotFound",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class PendingMargonemAccountRefetchNotFound extends Schema.TaggedError<PendingMargonemAccountRefetchNotFound>()(
  "PendingMargonemAccountRefetchNotFound",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class FirecrawlMonthlyBudgetExhausted extends Schema.TaggedError<FirecrawlMonthlyBudgetExhausted>()(
  "FirecrawlMonthlyBudgetExhausted",
  {
    monthlyRequestBudget: Schema.Finite,
    usedRequests: Schema.Finite,
    yearMonth: FirecrawlYearMonth,
  }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class FirecrawlUserMonthlyBudgetExhausted extends Schema.TaggedError<FirecrawlUserMonthlyBudgetExhausted>()(
  "FirecrawlUserMonthlyBudgetExhausted",
  {
    monthlyRequestBudget: Schema.Finite,
    usedRequests: Schema.Finite,
    yearMonth: FirecrawlYearMonth,
  }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class MargonemAccountAlreadyOwnedByActor extends Schema.TaggedError<MargonemAccountAlreadyOwnedByActor>()(
  "MargonemAccountAlreadyOwnedByActor",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class MargonemAccountOwnedByAnotherUser extends Schema.TaggedError<MargonemAccountOwnedByAnotherUser>()(
  "MargonemAccountOwnedByAnotherUser",
  {}
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class MargonemAccountAlreadySharedWithActor extends Schema.TaggedError<MargonemAccountAlreadySharedWithActor>()(
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

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadBuilderPersistenceUnavailable extends Schema.TaggedError<SquadBuilderPersistenceUnavailable>()(
  "SquadBuilderPersistenceUnavailable",
  {
    cause: Schema.Defect(),
    operation: SquadBuilderPersistenceOperationSchema,
    provider: Schema.Literal("postgres"),
  }
) {}
