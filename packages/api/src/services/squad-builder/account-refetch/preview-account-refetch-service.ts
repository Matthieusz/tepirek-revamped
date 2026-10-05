import * as DateTime from "effect/DateTime";
import * as EffectRuntime from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { computeMargonemAccountRefetchDiff } from "../../../domain/squad-builder/margonem-account-refetch-diff.ts";
import { parseMargonemProfileHtml } from "../../../domain/squad-builder/margonem-profile-html-parser.ts";
import type { ParseMargonemProfileHtmlError } from "../../../domain/squad-builder/margonem-profile-html-parser.ts";
import { toMargonemProfileUrl } from "../../../domain/squad-builder/margonem-profile-url.ts";
import type { FirecrawlScrapeError } from "../firecrawl-client.ts";
import type { FirecrawlBudgetError } from "../firecrawl-request-accounting-store.ts";
import { scrapeProfile } from "../firecrawl-scrape-request.ts";
import type {
  ActorDoesNotOwnMargonemAccount,
  MargonemAccountNotFound,
  SquadBuilderPersistenceUnavailable,
} from "../squad-groups/squad-group-errors.ts";
import { AccountRefetchStoreService } from "./account-refetch-store.ts";

export interface PreviewAccountRefetchInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
}

export type PreviewAccountRefetchError =
  | MargonemAccountNotFound
  | ActorDoesNotOwnMargonemAccount
  | FirecrawlBudgetError
  | FirecrawlScrapeError
  | ParseMargonemProfileHtmlError
  | SquadBuilderPersistenceUnavailable;

const pendingRefetchPolicy = { expiresAfterMinutes: 30 } as const;

/** Fetch latest account HTML and store a pending refetch diff for owner confirmation. */
export const preview = EffectRuntime.fn("AccountRefetch.preview")(
  function* previewAccountRefetchEffect(input: PreviewAccountRefetchInput) {
    const store = yield* AccountRefetchStoreService;
    const account = yield* store.getAccountForRefetch(input);

    const { html, creditsUsed } = yield* scrapeProfile({
      actorUserId: input.actorUserId,
      profileId: account.profileId,
    });

    const parsedHtml = yield* parseMargonemProfileHtml({
      html,
      profileId: account.profileId,
    });

    const fetchedDateTime = yield* DateTime.now;
    const fetchedAt = DateTime.toDate(fetchedDateTime);

    const diff = computeMargonemAccountRefetchDiff({
      accountId: account.accountId,
      currentCharacters: account.currentCharacters,
      fetchedAt,
      latestCharacters: parsedHtml.jarunaCharacters,
      profileId: account.profileId,
    });

    const pending = yield* store.createPendingRefetch({
      accountId: account.accountId,
      actorUserId: input.actorUserId,
      expiresAt: fetchedDateTime.pipe(
        DateTime.add({ minutes: pendingRefetchPolicy.expiresAfterMinutes }),
        DateTime.toDate
      ),
      fetchedAt,
      latestCharacters: parsedHtml.jarunaCharacters,
      profileId: account.profileId,
    });

    return {
      accountId: account.accountId,
      diff,
      fetchedAt,
      firecrawlCreditsUsed: creditsUsed,
      generatedProfileUrl: toMargonemProfileUrl(account.profileId),
      profileId: account.profileId,
      refetchPreviewId: pending.id,
    };
  }
);
