import * as Schema from "effect/Schema";

export class EffectSquadBuilderPersistenceUnavailable extends Schema.TaggedErrorClass<EffectSquadBuilderPersistenceUnavailable>()(
  "SquadBuilderPersistenceUnavailable",
  {
    cause: Schema.Unknown,
    operation: Schema.Literals([
      "createSquadGroup",
      "createOwnedAccountFromPendingImport",
      "createPendingImport",
      "createPendingRefetch",
      "findPendingImportForConfirmation",
      "findProfileAccessState",
      "getAccountForRefetch",
      "getSquadGroupDetail",
      "listAvailableCharactersForOwner",
      "listGlobalSquadGroups",
      "listMySquadGroups",
      "listOwnedAccounts",
      "markRequestFailed",
      "markRequestSucceeded",
      "reserveRequest",
      "setSquadGroupVisibility",
    ]),
    provider: Schema.Literal("postgres"),
  }
) {}
