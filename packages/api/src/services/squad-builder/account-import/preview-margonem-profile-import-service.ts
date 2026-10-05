/* eslint-disable promise/prefer-await-to-callbacks -- Effect Match handlers are synchronous pattern handlers, not Promise callbacks. */
import * as DateTime from "effect/DateTime";
import * as EffectRuntime from "effect/Effect";
import * as Match from "effect/Match";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemCharacterPreview } from "../../../domain/squad-builder/margonem-character.ts";
import { parseMargonemProfileHtml } from "../../../domain/squad-builder/margonem-profile-html-parser.ts";
import type { ParseMargonemProfileHtmlError } from "../../../domain/squad-builder/margonem-profile-html-parser.ts";
import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import {
  parseMargonemProfileUrl,
  toMargonemProfileUrl,
} from "../../../domain/squad-builder/margonem-profile-url.ts";
import type { ParseMargonemProfileUrlError } from "../../../domain/squad-builder/margonem-profile-url.ts";
import type { FirecrawlScrapeError } from "../firecrawl-client.ts";
import type { FirecrawlCreditCount } from "../firecrawl-config.ts";
import type { FirecrawlBudgetError } from "../firecrawl-request-accounting-store.ts";
import { scrapeProfile } from "../firecrawl-scrape-request.ts";
import {
  MargonemAccountAlreadyOwnedByActor,
  MargonemAccountAlreadySharedWithActor,
  MargonemAccountOwnedByAnotherUser,
} from "../squad-groups/squad-group-errors.ts";
import type { SquadBuilderPersistenceUnavailable } from "../squad-groups/squad-group-errors.ts";
import { AccountImportStoreService } from "./account-import-store.ts";
import type {
  DuplicateMargonemAccountError,
  ProfileAccessState,
} from "./account-import-store.ts";

/** Input for previewing a Margonem profile import. */
export interface PreviewMargonemProfileImportInput {
  readonly actorUserId: AppUserId;
  readonly profileUrl: string;
}

/** Output returned before import confirmation. */
export interface PreviewMargonemProfileImportOutput {
  readonly profileId: MargonemProfileId;
  readonly generatedProfileUrl: string;
  readonly suggestedAccountName: string;
  readonly lastFetchedAt: Date;
  readonly firecrawlCreditsUsed: FirecrawlCreditCount;
  readonly jarunaCharacters: readonly MargonemCharacterPreview[];
}

/** Expected failures returned by the profile import preview service. */
export type PreviewMargonemProfileImportError =
  | ParseMargonemProfileUrlError
  | DuplicateMargonemAccountError
  | FirecrawlBudgetError
  | FirecrawlScrapeError
  | ParseMargonemProfileHtmlError
  | SquadBuilderPersistenceUnavailable;

const noDuplicateAccountError = undefined;

const profileAccessStateToDuplicateError = (
  state: ProfileAccessState
): DuplicateMargonemAccountError | undefined =>
  Match.value(state).pipe(
    Match.tag("Available", () => noDuplicateAccountError),
    Match.tag("OwnedByActor", () => new MargonemAccountAlreadyOwnedByActor()),
    Match.tag(
      "OwnedByAnotherUser",
      () => new MargonemAccountOwnedByAnotherUser()
    ),
    Match.tag(
      "SharedWithActor",
      () => new MargonemAccountAlreadySharedWithActor()
    ),
    Match.exhaustive
  );

/** Preview a Margonem profile import without saving the account. */
export const preview = EffectRuntime.fn("AccountImport.previewProfile")(
  function* previewEffect(input: PreviewMargonemProfileImportInput) {
    const store = yield* AccountImportStoreService;
    const profileId = yield* parseMargonemProfileUrl(input.profileUrl);

    const accessState = yield* store.findProfileAccessState({
      actorUserId: input.actorUserId,
      profileId,
    });

    const duplicateError = profileAccessStateToDuplicateError(accessState);

    if (duplicateError !== undefined) {
      return yield* duplicateError;
    }

    const { html, creditsUsed } = yield* scrapeProfile({
      actorUserId: input.actorUserId,
      profileId,
    });

    const parsedHtml = yield* parseMargonemProfileHtml({
      html,
      profileId,
    });

    const lastFetchedAt = yield* DateTime.nowAsDate;

    return {
      firecrawlCreditsUsed: creditsUsed,
      generatedProfileUrl: toMargonemProfileUrl(profileId),
      jarunaCharacters: parsedHtml.jarunaCharacters,
      lastFetchedAt,
      profileId,
      suggestedAccountName: parsedHtml.suggestedAccountName,
    };
  }
);
