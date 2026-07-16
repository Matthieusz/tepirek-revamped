import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/** A validated squad group name. */
export const SquadGroupName = Schema.String.pipe(
  Schema.brand("SquadGroupName")
);
export type SquadGroupName = typeof SquadGroupName.Type;

/** A validated squad name. */
export const SquadName = Schema.String.pipe(Schema.brand("SquadName"));
export type SquadName = typeof SquadName.Type;

/** Expected failure when a squad group name is invalid. */
export class InvalidSquadGroupName extends Schema.TaggedErrorClass<InvalidSquadGroupName>()(
  "InvalidSquadGroupName",
  {
    message: Schema.String,
  }
) {}

/** Expected failure when a squad name is invalid. */
// oxlint-disable-next-line max-classes-per-file -- closely related domain errors
export class InvalidSquadName extends Schema.TaggedErrorClass<InvalidSquadName>()(
  "InvalidSquadName",
  {
    message: Schema.String,
  }
) {}

/** Naming limits used by squad builder. */
export const squadBuilderNamingPolicy = {
  squadGroupNameMaxLength: 80,
  squadNameMaxLength: 60,
  trim: true,
} as const;

/** Parse and normalize a squad group name. */
export const parseSquadGroupName = Effect.fn("SquadGroupName.parse")(
  function* parseSquadGroupName(input: string) {
    const name = squadBuilderNamingPolicy.trim ? input.trim() : input;

    if (name.length === 0) {
      return yield* new InvalidSquadGroupName({
        message: "Nazwa grupy składów jest wymagana",
      });
    }

    if (name.length > squadBuilderNamingPolicy.squadGroupNameMaxLength) {
      return yield* new InvalidSquadGroupName({
        message: `Nazwa grupy składów może mieć maksymalnie ${squadBuilderNamingPolicy.squadGroupNameMaxLength} znaków`,
      });
    }

    return yield* Schema.decodeUnknownEffect(SquadGroupName)(name).pipe(
      Effect.catchTag(
        "SchemaError",
        () =>
          new InvalidSquadGroupName({
            message: "Nieoczekiwany błąd walidacji nazwy grupy składów",
          })
      )
    );
  }
);

/** Parse and normalize a squad name. */
export const parseSquadName = Effect.fn("SquadName.parse")(
  function* parseSquadName(input: string) {
    const name = squadBuilderNamingPolicy.trim ? input.trim() : input;

    if (name.length === 0) {
      return yield* new InvalidSquadName({
        message: "Nazwa składu jest wymagana",
      });
    }

    if (name.length > squadBuilderNamingPolicy.squadNameMaxLength) {
      return yield* new InvalidSquadName({
        message: `Nazwa składu może mieć maksymalnie ${squadBuilderNamingPolicy.squadNameMaxLength} znaków`,
      });
    }

    return yield* Schema.decodeUnknownEffect(SquadName)(name).pipe(
      Effect.catchTag(
        "SchemaError",
        () =>
          new InvalidSquadName({
            message: "Nieoczekiwany błąd walidacji nazwy składu",
          })
      )
    );
  }
);

/** Convert a squad group name to its primitive representation. */
export const squadGroupNameToString = (name: SquadGroupName): string => name;

/** Convert a squad name to its primitive representation. */
export const squadNameToString = (name: SquadName): string => name;
