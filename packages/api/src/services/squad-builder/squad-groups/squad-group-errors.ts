/* eslint-disable max-classes-per-file -- Domain error schemas are intentionally collocated for HttpApi/OpenApi error unions. */
import * as Schema from "effect/Schema";

const notFound = { httpApiStatus: 404 } as const;
const forbidden = { httpApiStatus: 403 } as const;
const badRequest = { httpApiStatus: 400 } as const;
const conflict = { httpApiStatus: 409 } as const;
const serviceUnavailable = { httpApiStatus: 503 } as const;

export const InvitationStatusSchema = Schema.Literals([
  "pending",
  "accepted",
  "declined",
  "revoked",
]);

export class SquadGroupNotFound extends Schema.TaggedErrorClass<SquadGroupNotFound>()(
  "SquadGroupNotFound",
  {},
  notFound
) {}

export class ActorDoesNotOwnSquadGroup extends Schema.TaggedErrorClass<ActorDoesNotOwnSquadGroup>()(
  "ActorDoesNotOwnSquadGroup",
  {},
  forbidden
) {}

export class ActorCannotViewSquadGroup extends Schema.TaggedErrorClass<ActorCannotViewSquadGroup>()(
  "ActorCannotViewSquadGroup",
  {},
  forbidden
) {}

export class ActorCannotEditSquadGroup extends Schema.TaggedErrorClass<ActorCannotEditSquadGroup>()(
  "ActorCannotEditSquadGroup",
  {},
  forbidden
) {}

export class CannotInviteSelf extends Schema.TaggedErrorClass<CannotInviteSelf>()(
  "CannotInviteSelf",
  {},
  badRequest
) {}

export class SquadEditorInviteTargetNotFound extends Schema.TaggedErrorClass<SquadEditorInviteTargetNotFound>()(
  "SquadEditorInviteTargetNotFound",
  {},
  notFound
) {}

export class SquadEditorInviteTargetNotVerified extends Schema.TaggedErrorClass<SquadEditorInviteTargetNotVerified>()(
  "SquadEditorInviteTargetNotVerified",
  {},
  forbidden
) {}

export class SquadGroupInvitationNotFound extends Schema.TaggedErrorClass<SquadGroupInvitationNotFound>()(
  "SquadGroupInvitationNotFound",
  {},
  notFound
) {}

export class ActorIsNotSquadGroupInviteRecipient extends Schema.TaggedErrorClass<ActorIsNotSquadGroupInviteRecipient>()(
  "ActorIsNotSquadGroupInviteRecipient",
  {},
  forbidden
) {}

export class SquadGroupInvitationTransitionNotAllowed extends Schema.TaggedErrorClass<SquadGroupInvitationTransitionNotAllowed>()(
  "SquadGroupInvitationTransitionNotAllowed",
  {
    attempted: Schema.String,
    currentStatus: InvitationStatusSchema,
  },
  conflict
) {}

export class SquadNotInGroup extends Schema.TaggedErrorClass<SquadNotInGroup>()(
  "SquadNotInGroup",
  {
    squadId: Schema.Number,
  },
  badRequest
) {}

export class EditorCannotChangeSquadStructure extends Schema.TaggedErrorClass<EditorCannotChangeSquadStructure>()(
  "EditorCannotChangeSquadStructure",
  {},
  forbidden
) {}

export class SquadCharacterNotAccessible extends Schema.TaggedErrorClass<SquadCharacterNotAccessible>()(
  "SquadCharacterNotAccessible",
  {
    characterId: Schema.Number,
  },
  forbidden
) {}

export class MargonemAccountNotFound extends Schema.TaggedErrorClass<MargonemAccountNotFound>()(
  "MargonemAccountNotFound",
  {},
  notFound
) {}

export class ActorDoesNotOwnMargonemAccount extends Schema.TaggedErrorClass<ActorDoesNotOwnMargonemAccount>()(
  "ActorDoesNotOwnMargonemAccount",
  {},
  forbidden
) {}

export class InviteTargetNotFound extends Schema.TaggedErrorClass<InviteTargetNotFound>()(
  "InviteTargetNotFound",
  {},
  notFound
) {}

export class InviteTargetNotVerified extends Schema.TaggedErrorClass<InviteTargetNotVerified>()(
  "InviteTargetNotVerified",
  {},
  forbidden
) {}

export class AccountAccessInviteNotFound extends Schema.TaggedErrorClass<AccountAccessInviteNotFound>()(
  "AccountAccessInviteNotFound",
  {},
  notFound
) {}

export class ActorIsNotInviteRecipient extends Schema.TaggedErrorClass<ActorIsNotInviteRecipient>()(
  "ActorIsNotInviteRecipient",
  {},
  forbidden
) {}

export class AccountAccessTransitionNotAllowed extends Schema.TaggedErrorClass<AccountAccessTransitionNotAllowed>()(
  "AccountAccessTransitionNotAllowed",
  {
    attempted: Schema.String,
    currentStatus: InvitationStatusSchema,
  },
  conflict
) {}

export class PendingMargonemAccountImportNotFound extends Schema.TaggedErrorClass<PendingMargonemAccountImportNotFound>()(
  "PendingMargonemAccountImportNotFound",
  {},
  notFound
) {}

export class PendingMargonemAccountRefetchNotFound extends Schema.TaggedErrorClass<PendingMargonemAccountRefetchNotFound>()(
  "PendingMargonemAccountRefetchNotFound",
  {},
  notFound
) {}

export class EffectSquadBuilderPersistenceUnavailable extends Schema.TaggedErrorClass<EffectSquadBuilderPersistenceUnavailable>()(
  "SquadBuilderPersistenceUnavailable",
  {
    cause: Schema.Defect(),
    operation: Schema.Literals([
      "applyRefetchedAccount",
      "authorizeSquadGroupOwner",
      "createSquadGroup",
      "createOwnedAccountFromPendingImport",
      "createPendingImport",
      "createPendingRefetch",
      "findOwnedAccountForSharing",
      "findVerifiedInviteTarget",
      "findVerifiedSquadEditorInviteTarget",
      "findPendingImportForConfirmation",
      "findPendingRefetchForApply",
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
      "markPendingRefetchApplied",
      "markRequestFailed",
      "markRequestSucceeded",
      "reserveRequest",
      "respondToAccountAccessInvite",
      "respondToSquadGroupInvite",
      "revokeAccountAccess",
      "revokeSquadGroupEditor",
      "saveSharedSquadGroupCharacters",
      "saveSquadGroupSnapshot",
      "searchSquadEditorInviteTargets",
      "searchInviteTargets",
      "setSquadGroupVisibility",
      "upsertAccountAccessInvite",
      "upsertSquadGroupEditorInvite",
    ]),
    provider: Schema.Literal("postgres"),
  },
  serviceUnavailable
) {}
