import * as Schema from "effect/Schema";

export class EffectSquadBuilderPersistenceUnavailable extends Schema.TaggedErrorClass<EffectSquadBuilderPersistenceUnavailable>()(
  "SquadBuilderPersistenceUnavailable",
  {
    cause: Schema.Unknown,
    operation: Schema.Literals([
      "createSquadGroup",
      "getSquadGroupDetail",
      "listAvailableCharactersForOwner",
      "listGlobalSquadGroups",
      "listMySquadGroups",
      "listOwnedAccounts",
      "setSquadGroupVisibility",
    ]),
    provider: Schema.Literal("postgres"),
  }
) {}
