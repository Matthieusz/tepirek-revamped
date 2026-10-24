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
export class SquadGroupNotFound extends Schema.TaggedError<
  SquadGroupNotFound,
  { readonly brand: unique symbol }
>()("SquadGroupNotFound", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class ActorDoesNotOwnSquadGroup extends Schema.TaggedError<
  ActorDoesNotOwnSquadGroup,
  { readonly brand: unique symbol }
>()("ActorDoesNotOwnSquadGroup", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class ActorCannotViewSquadGroup extends Schema.TaggedError<
  ActorCannotViewSquadGroup,
  { readonly brand: unique symbol }
>()("ActorCannotViewSquadGroup", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class ActorCannotEditSquadGroup extends Schema.TaggedError<
  ActorCannotEditSquadGroup,
  { readonly brand: unique symbol }
>()("ActorCannotEditSquadGroup", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class CannotInviteSelf extends Schema.TaggedError<
  CannotInviteSelf,
  { readonly brand: unique symbol }
>()("CannotInviteSelf", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadEditorInviteTargetNotFound extends Schema.TaggedError<
  SquadEditorInviteTargetNotFound,
  { readonly brand: unique symbol }
>()("SquadEditorInviteTargetNotFound", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadEditorInviteTargetNotVerified extends Schema.TaggedError<
  SquadEditorInviteTargetNotVerified,
  { readonly brand: unique symbol }
>()("SquadEditorInviteTargetNotVerified", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadGroupInvitationNotFound extends Schema.TaggedError<
  SquadGroupInvitationNotFound,
  { readonly brand: unique symbol }
>()("SquadGroupInvitationNotFound", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class ActorIsNotSquadGroupInviteRecipient extends Schema.TaggedError<
  ActorIsNotSquadGroupInviteRecipient,
  { readonly brand: unique symbol }
>()("ActorIsNotSquadGroupInviteRecipient", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadGroupInvitationTransitionNotAllowed extends Schema.TaggedError<
  SquadGroupInvitationTransitionNotAllowed,
  { readonly brand: unique symbol }
>()("SquadGroupInvitationTransitionNotAllowed", {
  attempted: Schema.String,
  currentStatus: InvitationStatusSchema,
}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadGroupWriteConflict extends Schema.TaggedError<
  SquadGroupWriteConflict,
  { readonly brand: unique symbol }
>()("SquadGroupWriteConflict", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadNotInGroup extends Schema.TaggedError<
  SquadNotInGroup,
  { readonly brand: unique symbol }
>()("SquadNotInGroup", {
  squadId: Schema.Finite,
}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class EditorCannotChangeSquadStructure extends Schema.TaggedError<
  EditorCannotChangeSquadStructure,
  { readonly brand: unique symbol }
>()("EditorCannotChangeSquadStructure", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class MargonemAccountNotFound extends Schema.TaggedError<
  MargonemAccountNotFound,
  { readonly brand: unique symbol }
>()("MargonemAccountNotFound", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class ActorDoesNotOwnMargonemAccount extends Schema.TaggedError<
  ActorDoesNotOwnMargonemAccount,
  { readonly brand: unique symbol }
>()("ActorDoesNotOwnMargonemAccount", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class InviteTargetNotFound extends Schema.TaggedError<
  InviteTargetNotFound,
  { readonly brand: unique symbol }
>()("InviteTargetNotFound", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class InviteTargetNotVerified extends Schema.TaggedError<
  InviteTargetNotVerified,
  { readonly brand: unique symbol }
>()("InviteTargetNotVerified", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class AccountAccessInviteNotFound extends Schema.TaggedError<
  AccountAccessInviteNotFound,
  { readonly brand: unique symbol }
>()("AccountAccessInviteNotFound", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class ActorIsNotInviteRecipient extends Schema.TaggedError<
  ActorIsNotInviteRecipient,
  { readonly brand: unique symbol }
>()("ActorIsNotInviteRecipient", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class AccountAccessTransitionNotAllowed extends Schema.TaggedError<
  AccountAccessTransitionNotAllowed,
  { readonly brand: unique symbol }
>()("AccountAccessTransitionNotAllowed", {
  attempted: Schema.String,
  currentStatus: InvitationStatusSchema,
}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class PendingMargonemAccountImportNotFound extends Schema.TaggedError<
  PendingMargonemAccountImportNotFound,
  { readonly brand: unique symbol }
>()("PendingMargonemAccountImportNotFound", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class PendingMargonemAccountRefetchNotFound extends Schema.TaggedError<
  PendingMargonemAccountRefetchNotFound,
  { readonly brand: unique symbol }
>()("PendingMargonemAccountRefetchNotFound", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class FirecrawlMonthlyBudgetExhausted extends Schema.TaggedError<
  FirecrawlMonthlyBudgetExhausted,
  { readonly brand: unique symbol }
>()("FirecrawlMonthlyBudgetExhausted", {
  monthlyRequestBudget: Schema.Finite,
  usedRequests: Schema.Finite,
  yearMonth: FirecrawlYearMonth,
}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class FirecrawlUserMonthlyBudgetExhausted extends Schema.TaggedError<
  FirecrawlUserMonthlyBudgetExhausted,
  { readonly brand: unique symbol }
>()("FirecrawlUserMonthlyBudgetExhausted", {
  monthlyRequestBudget: Schema.Finite,
  usedRequests: Schema.Finite,
  yearMonth: FirecrawlYearMonth,
}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class MargonemAccountAlreadyOwnedByActor extends Schema.TaggedError<
  MargonemAccountAlreadyOwnedByActor,
  { readonly brand: unique symbol }
>()("MargonemAccountAlreadyOwnedByActor", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class MargonemAccountOwnedByAnotherUser extends Schema.TaggedError<
  MargonemAccountOwnedByAnotherUser,
  { readonly brand: unique symbol }
>()("MargonemAccountOwnedByAnotherUser", {}) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class MargonemAccountAlreadySharedWithActor extends Schema.TaggedError<
  MargonemAccountAlreadySharedWithActor,
  { readonly brand: unique symbol }
>()("MargonemAccountAlreadySharedWithActor", {}) {}

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
export class SquadBuilderPersistenceUnavailable extends Schema.TaggedError<
  SquadBuilderPersistenceUnavailable,
  { readonly brand: unique symbol }
>()("SquadBuilderPersistenceUnavailable", {
  cause: Schema.Defect(),
  operation: SquadBuilderPersistenceOperationSchema,
  provider: Schema.Literal("postgres"),
}) {}
