import { parseMargonemProfileId } from "./margonem-profile-id.js";
import type { MargonemProfileId } from "./margonem-profile-id.js";
import { fail, isFailure, success } from "./outcome.js";
import type { Outcome } from "./outcome.js";

/** Expected failure when a Margonem profile URL cannot be parsed. */
export type ParseMargonemProfileUrlError =
  | {
      readonly _tag: "InvalidMargonemProfileUrl";
      readonly message: string;
    }
  | {
      readonly _tag: "MissingMargonemProfileId";
      readonly message: string;
    };

const profilePathPattern = /^\/profile\/view,(?<profileId>\d+)$/u;

/** Parse a Margonem profile URL and return the canonical numeric profile id. */
export const parseMargonemProfileUrl = (
  input: string
): Outcome<MargonemProfileId, ParseMargonemProfileUrlError> => {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    return fail({
      _tag: "InvalidMargonemProfileUrl",
      message: "Invalid Margonem profile URL",
    });
  }

  if (url.protocol !== "https:" || url.hostname !== "www.margonem.pl") {
    return fail({
      _tag: "InvalidMargonemProfileUrl",
      message: "Expected a www.margonem.pl profile URL",
    });
  }

  const match = profilePathPattern.exec(url.pathname);
  const profileIdText = match?.groups?.profileId;

  if (profileIdText === undefined) {
    return fail({
      _tag: "MissingMargonemProfileId",
      message: "Margonem profile id is missing",
    });
  }

  const profileId = Number(profileIdText);
  const parsedProfileId = parseMargonemProfileId(profileId);

  if (isFailure(parsedProfileId)) {
    return fail({
      _tag: "MissingMargonemProfileId",
      message: "Margonem profile id is invalid",
    });
  }

  return success(parsedProfileId.value);
};

/** Build the canonical Margonem profile URL used for Firecrawl and outbound links. */
export const toMargonemProfileUrl = (profileId: MargonemProfileId): string =>
  `https://www.margonem.pl/profile/view,${profileId}`;
