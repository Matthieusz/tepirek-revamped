import * as Schema from "effect/Schema";

/** Accepts browser-friendly arrays while decoding only non-empty user selections. */
export const NonEmptyUserIdsSchema = Schema.Array(Schema.String).pipe(
  Schema.refine(
    (userIds): userIds is readonly [string, ...string[]] => userIds.length > 0,
    { message: "Wybierz co najmniej jednego gracza" }
  ),
  Schema.decodeTo(Schema.NonEmptyArray(Schema.String))
);
