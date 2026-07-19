import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { parseMargonemProfileId } from "./margonem-profile-id.ts";
import type { MargonemProfileId } from "./margonem-profile-id.ts";

/** Expected failure when a Margonem profile URL cannot be parsed. */
export class InvalidMargonemProfileUrl extends Schema.TaggedErrorClass<InvalidMargonemProfileUrl>()(
  "InvalidMargonemProfileUrl",
  {
    message: Schema.String,
  }
) {}

/** Expected failure when a Margonem profile id is missing from a profile URL. */
// oxlint-disable-next-line max-classes-per-file -- closely related domain errors
export class MissingMargonemProfileId extends Schema.TaggedErrorClass<MissingMargonemProfileId>()(
  "MissingMargonemProfileId",
  {
    message: Schema.String,
  }
) {}

/** Expected failures while parsing a Margonem profile URL. */
export type ParseMargonemProfileUrlError =
  | InvalidMargonemProfileUrl
  | MissingMargonemProfileId;

const profilePathPattern = /^\/profile\/view,(?<profileId>\d+)$/u;

/** Parse a Margonem profile URL and return the canonical numeric profile id. */
export const parseMargonemProfileUrl = Effect.fn("MargonemProfileUrl.parse")(
  function* parseMargonemProfileUrl(
    input: string
  ): Effect.fn.Return<MargonemProfileId, ParseMargonemProfileUrlError> {
    const url = yield* Effect.try({
      catch: () =>
        new InvalidMargonemProfileUrl({
          message: "Invalid Margonem profile URL",
        }),
      try: () => new URL(input),
    });

    if (url.protocol !== "https:" || url.hostname !== "www.margonem.pl") {
      return yield* new InvalidMargonemProfileUrl({
        message: "Expected a www.margonem.pl profile URL",
      });
    }

    const match = profilePathPattern.exec(url.pathname);
    const profileIdText = match?.groups?.profileId;

    if (profileIdText === undefined) {
      return yield* new MissingMargonemProfileId({
        message: "Margonem profile id is missing",
      });
    }

    const profileId = Number(profileIdText);

    return yield* parseMargonemProfileId(profileId).pipe(
      Effect.catchTag(
        "InvalidPositiveInteger",
        () =>
          new MissingMargonemProfileId({
            message: "Margonem profile id is invalid",
          })
      )
    );
  }
);

/** Build the canonical Margonem profile URL used for Firecrawl and outbound links. */
export const toMargonemProfileUrl = (profileId: MargonemProfileId): string =>
  `https://www.margonem.pl/profile/view,${profileId}`;
