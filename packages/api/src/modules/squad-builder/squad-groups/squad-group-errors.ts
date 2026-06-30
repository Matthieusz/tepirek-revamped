import * as Schema from "effect/Schema";

export class EffectSquadBuilderPersistenceUnavailable extends Schema.TaggedErrorClass<EffectSquadBuilderPersistenceUnavailable>()(
  "SquadBuilderPersistenceUnavailable",
  {
    cause: Schema.Unknown,
    operation: Schema.Literals([
      "createSquadGroup",
      "getSquadGroupDetail",
      "listAvailableCharactersForOwner",
      "listMySquadGroups",
    ]),
    provider: Schema.Literal("postgres"),
  }
) {}
