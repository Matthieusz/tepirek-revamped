import * as Schema from "effect/Schema";

export class EffectSquadBuilderPersistenceUnavailable extends Schema.TaggedErrorClass<EffectSquadBuilderPersistenceUnavailable>()(
  "SquadBuilderPersistenceUnavailable",
  {
    cause: Schema.Unknown,
    operation: Schema.Literals([
      "applyRefetchedAccount",
      "createSquadGroup",
      "createOwnedAccountFromPendingImport",
      "createPendingImport",
      "createPendingRefetch",
      "findOwnedAccountForSharing",
      "findVerifiedInviteTarget",
      "findPendingImportForConfirmation",
      "findPendingRefetchForApply",
      "findProfileAccessState",
      "getAccountForRefetch",
      "getSquadGroupDetail",
      "listAvailableCharactersForOwner",
      "listGlobalSquadGroups",
      "listMySquadGroups",
      "listOwnedAccounts",
      "markPendingRefetchApplied",
      "markRequestFailed",
      "markRequestSucceeded",
      "reserveRequest",
      "searchInviteTargets",
      "setSquadGroupVisibility",
      "upsertAccountAccessInvite",
    ]),
    provider: Schema.Literal("postgres"),
  }
) {}
