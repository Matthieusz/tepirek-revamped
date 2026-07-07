import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/** A validated squad group name. */
export type SquadGroupName = string & { readonly __brand: "SquadGroupName" };

/** A validated squad name. */
export type SquadName = string & { readonly __brand: "SquadName" };

/** Expected failure when a squad group name is invalid. */
export class InvalidSquadGroupName extends Schema.TaggedErrorClass<InvalidSquadGroupName>()(
  "InvalidSquadGroupName",
  {
    message: Schema.String,
  }
) {}

/** Expected failure when a squad name is invalid. */
export interface InvalidSquadName {
  readonly _tag: "InvalidSquadName";
  readonly message: string;
}

/** Naming limits used by squad builder. */
export const squadBuilderNamingPolicy = {
  squadGroupNameMaxLength: 80,
  squadNameMaxLength: 60,
  trim: true,
} as const;

/** Parse and normalize a squad group name. */
export const parseSquadGroupName = (
  input: string
): Effect.Effect<SquadGroupName, InvalidSquadGroupName> => {
  const name = squadBuilderNamingPolicy.trim ? input.trim() : input;

  if (name.length === 0) {
    return Effect.fail(
      new InvalidSquadGroupName({
        message: "Nazwa grupy składów jest wymagana",
      })
    );
  }

  if (name.length > squadBuilderNamingPolicy.squadGroupNameMaxLength) {
    return Effect.fail(
      new InvalidSquadGroupName({
        message: `Nazwa grupy składów może mieć maksymalnie ${squadBuilderNamingPolicy.squadGroupNameMaxLength} znaków`,
      })
    );
  }

  // SAFETY: non-empty trimmed string within max length established the invariant.
  return Effect.succeed(name as SquadGroupName);
};

/** Parse and normalize a squad name. */
export const parseSquadName = (
  input: string
): Effect.Effect<SquadName, InvalidSquadName> => {
  const name = squadBuilderNamingPolicy.trim ? input.trim() : input;

  if (name.length === 0) {
    return Effect.fail({
      _tag: "InvalidSquadName",
      message: "Nazwa składu jest wymagana",
    });
  }

  if (name.length > squadBuilderNamingPolicy.squadNameMaxLength) {
    return Effect.fail({
      _tag: "InvalidSquadName",
      message: `Nazwa składu może mieć maksymalnie ${squadBuilderNamingPolicy.squadNameMaxLength} znaków`,
    });
  }

  // SAFETY: non-empty trimmed string within max length established the invariant.
  return Effect.succeed(name as SquadName);
};

/** Convert a squad group name to its primitive representation. */
export const squadGroupNameToString = (name: SquadGroupName): string => name;

/** Convert a squad name to its primitive representation. */
export const squadNameToString = (name: SquadName): string => name;
