import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/** Naming limits used by squad builder. */
export const squadBuilderNamingPolicy = {
  squadGroupNameMaxLength: 80,
  squadNameMaxLength: 60,
} as const;

/** A validated squad group name. */
export const SquadGroupName = Schema.Trim.pipe(
  Schema.check(
    Schema.isLengthBetween(1, squadBuilderNamingPolicy.squadGroupNameMaxLength)
  ),
  Schema.brand("SquadGroupName")
);
export type SquadGroupName = typeof SquadGroupName.Type;

/** A validated squad name. */
export const SquadName = Schema.Trim.pipe(
  Schema.check(
    Schema.isLengthBetween(1, squadBuilderNamingPolicy.squadNameMaxLength)
  ),
  Schema.brand("SquadName")
);
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

/** Parse and normalize a squad group name. */
export const parseSquadGroupName = Effect.fn("SquadGroupName.parse")(
  function* parseSquadGroupName(input: string) {
    return yield* Schema.decodeUnknownEffect(SquadGroupName)(input).pipe(
      Effect.catchTag(
        "SchemaError",
        () =>
          new InvalidSquadGroupName({
            message:
              input.trim().length === 0
                ? "Nazwa grupy składów jest wymagana"
                : `Nazwa grupy składów może mieć maksymalnie ${squadBuilderNamingPolicy.squadGroupNameMaxLength} znaków`,
          })
      )
    );
  }
);

/** Parse and normalize a squad name. */
export const parseSquadName = Effect.fn("SquadName.parse")(
  function* parseSquadName(input: string) {
    return yield* Schema.decodeUnknownEffect(SquadName)(input).pipe(
      Effect.catchTag(
        "SchemaError",
        () =>
          new InvalidSquadName({
            message:
              input.trim().length === 0
                ? "Nazwa składu jest wymagana"
                : `Nazwa składu może mieć maksymalnie ${squadBuilderNamingPolicy.squadNameMaxLength} znaków`,
          })
      )
    );
  }
);

/** Convert a squad group name to its primitive representation. */
export const squadGroupNameToString = (name: SquadGroupName): string => name;

/** Convert a squad name to its primitive representation. */
export const squadNameToString = (name: SquadName): string => name;
