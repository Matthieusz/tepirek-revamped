import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import type {
  FirecrawlClient,
  FirecrawlScrapeError,
} from "../firecrawl-client";
import { parseFirecrawlCreditCount } from "../firecrawl-config";
import type { FirecrawlConfig } from "../firecrawl-config";
import { firecrawlYearMonthFromDate } from "../firecrawl-year-month";
import { parseMargonemProfileHtml } from "../margonem-profile-html-parser";
import {
  parseMargonemProfileUrl,
  toMargonemProfileUrl,
} from "../margonem-profile-url";
import { isError } from "../result";
import { EffectSquadGroupStore } from "../squad-groups/squad-group-store";
import { profileAccessStateToDuplicateError } from "./preview-margonem-profile-import";
import type {
  Clock,
  PreviewMargonemProfileImportError,
  PreviewMargonemProfileImportInput,
  PreviewMargonemProfileImportOutput,
} from "./preview-margonem-profile-import";

/** Effect service module that previews one Margonem profile import without saving it. */
export class EffectPreviewMargonemProfileImport {
  private readonly firecrawl: FirecrawlClient;
  private readonly clock: Clock;
  private readonly config: FirecrawlConfig;

  constructor(
    firecrawl: FirecrawlClient,
    clock: Clock,
    config: FirecrawlConfig
  ) {
    this.firecrawl = firecrawl;
    this.clock = clock;
    this.config = config;
  }

  /** Preview a Margonem profile import without saving the account. */
  preview(
    input: PreviewMargonemProfileImportInput,
    options: { readonly signal?: AbortSignal } = {}
  ): Effect<
    PreviewMargonemProfileImportOutput,
    PreviewMargonemProfileImportError,
    EffectSquadGroupStore
  > {
    const { clock, config, firecrawl } = this;

    return EffectRuntime.gen(function* previewEffect() {
      const parsedProfileId = parseMargonemProfileUrl(input.profileUrl);

      if (isError(parsedProfileId)) {
        return yield* EffectRuntime.fail(parsedProfileId.error);
      }

      const profileId = parsedProfileId.value;
      const accessState = yield* EffectSquadGroupStore.use((store) =>
        store.findProfileAccessState({
          actorUserId: input.actorUserId,
          profileId,
        })
      );
      const duplicateError = profileAccessStateToDuplicateError(accessState);

      if (duplicateError !== undefined) {
        return yield* EffectRuntime.fail(duplicateError);
      }

      const yearMonth = firecrawlYearMonthFromDate(clock.now());
      const reservedRequest = yield* EffectSquadGroupStore.use((store) =>
        store.reserveRequest({
          monthlyRequestBudget: config.monthlyRequestBudget,
          profileId,
          requestedByUserId: input.actorUserId,
          yearMonth,
        })
      );
      const scrapedProfileResult = yield* EffectRuntime.tryPromise({
        catch: (cause) =>
          ({
            _tag: "FirecrawlRequestFailed",
            cause,
            profileId,
          }) satisfies FirecrawlScrapeError,
        try: () => firecrawl.scrapeProfileHtml(profileId, options),
      });

      if (isError(scrapedProfileResult)) {
        yield* EffectSquadGroupStore.use((store) =>
          store.markRequestFailed({
            errorTag: scrapedProfileResult.error._tag,
            requestId: reservedRequest.requestId,
          })
        );
        return yield* EffectRuntime.fail(scrapedProfileResult.error);
      }

      const scrapedProfile = scrapedProfileResult.value;
      const creditsUsed = parseFirecrawlCreditCount(
        scrapedProfile.metadata.creditsUsed ?? 1
      );

      if (isError(creditsUsed)) {
        yield* EffectSquadGroupStore.use((store) =>
          store.markRequestFailed({
            errorTag: creditsUsed.error._tag,
            requestId: reservedRequest.requestId,
          })
        );
        return yield* EffectRuntime.fail({
          _tag: "FirecrawlResponseNotParseable" as const,
          cause: new Error("Invalid Firecrawl creditsUsed"),
          profileId,
        });
      }

      yield* EffectSquadGroupStore.use((store) =>
        store.markRequestSucceeded({
          cacheState: scrapedProfile.metadata.cacheState ?? null,
          creditsUsed: creditsUsed.value,
          firecrawlStatusCode: scrapedProfile.metadata.statusCode ?? null,
          requestId: reservedRequest.requestId,
        })
      );

      const parsedHtml = parseMargonemProfileHtml({
        html: scrapedProfile.html,
        profileId,
      });

      if (isError(parsedHtml)) {
        return yield* EffectRuntime.fail(parsedHtml.error);
      }

      return {
        firecrawlCreditsUsed: creditsUsed.value,
        generatedProfileUrl: toMargonemProfileUrl(profileId),
        jarunaCharacters: parsedHtml.value.jarunaCharacters,
        lastFetchedAt: clock.now(),
        profileId,
        suggestedAccountName: parsedHtml.value.suggestedAccountName,
      };
    });
  }
}
