import * as ClockRuntime from "effect/Clock";
import * as Context from "effect/Context";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import { serviceUse } from "../../../effect/service-use.js";
import { FirecrawlClientService } from "../firecrawl-client-service.js";
import {
  FirecrawlRequestFailed,
  FirecrawlResponseNotParseable,
} from "../firecrawl-client.js";
import type { FirecrawlScrapeError } from "../firecrawl-client.js";
import {
  FirecrawlConfigService,
  parseFirecrawlCreditCount,
} from "../firecrawl-config.js";
import { firecrawlYearMonthFromDate } from "../firecrawl-year-month.js";
import { parseMargonemProfileHtml } from "../margonem-profile-html-parser.js";
import {
  parseMargonemProfileUrl,
  toMargonemProfileUrl,
} from "../margonem-profile-url.js";
import { isError } from "../result.js";
import { AccountImportStoreService } from "./account-import-store-service.js";
import { profileAccessStateToDuplicateError } from "./preview-margonem-profile-import.js";
import type { PreviewMargonemProfileImportInput } from "./preview-margonem-profile-import.js";

/** Preview a Margonem profile import without saving the account. */
export const preview = EffectRuntime.fn("AccountImport.previewProfile")(
  function* previewEffect(
    input: PreviewMargonemProfileImportInput,
    options: { readonly signal?: AbortSignal } = {}
  ) {
    const config = yield* FirecrawlConfigService;
    const firecrawl = yield* FirecrawlClientService;
    const parsedProfileId = parseMargonemProfileUrl(input.profileUrl);

    if (isError(parsedProfileId)) {
      return yield* EffectRuntime.fail(parsedProfileId.error);
    }

    const profileId = parsedProfileId.value;
    const accessState = yield* AccountImportStoreService.use((store) =>
      store.findProfileAccessState({
        actorUserId: input.actorUserId,
        profileId,
      })
    );
    const duplicateError = profileAccessStateToDuplicateError(accessState);

    if (duplicateError !== undefined) {
      return yield* EffectRuntime.fail(duplicateError);
    }

    const requestTimeMillis = yield* ClockRuntime.currentTimeMillis;
    const yearMonth = firecrawlYearMonthFromDate(new Date(requestTimeMillis));
    const reservedRequest = yield* AccountImportStoreService.use((store) =>
      store.reserveRequest({
        monthlyRequestBudget: config.monthlyRequestBudget,
        profileId,
        requestedByUserId: input.actorUserId,
        yearMonth,
      })
    );
    const scrapedProfileResult = yield* EffectRuntime.tryPromise({
      catch: (cause) =>
        new FirecrawlRequestFailed({
          cause,
          profileId,
        }) satisfies FirecrawlScrapeError,
      try: () => firecrawl.scrapeProfileHtml(profileId, options),
    });

    if (isError(scrapedProfileResult)) {
      yield* AccountImportStoreService.use((store) =>
        store.markRequestFailed({
          errorTag: scrapedProfileResult.error._tag,
          requestId: reservedRequest.requestId,
        })
      );
      return yield* scrapedProfileResult.error;
    }

    const scrapedProfile = scrapedProfileResult.value;
    const creditsUsed = parseFirecrawlCreditCount(
      scrapedProfile.metadata.creditsUsed ?? 1
    );

    if (isError(creditsUsed)) {
      yield* AccountImportStoreService.use((store) =>
        store.markRequestFailed({
          errorTag: creditsUsed.error._tag,
          requestId: reservedRequest.requestId,
        })
      );
      return yield* new FirecrawlResponseNotParseable({
        cause: new Error("Invalid Firecrawl creditsUsed"),
        profileId,
      });
    }

    yield* AccountImportStoreService.use((store) =>
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

    const fetchedTimeMillis = yield* ClockRuntime.currentTimeMillis;

    return {
      firecrawlCreditsUsed: creditsUsed.value,
      generatedProfileUrl: toMargonemProfileUrl(profileId),
      jarunaCharacters: parsedHtml.value.jarunaCharacters,
      lastFetchedAt: new Date(fetchedTimeMillis),
      profileId,
      suggestedAccountName: parsedHtml.value.suggestedAccountName,
    };
  }
);

export interface Interface {
  readonly preview: typeof preview;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/PreviewMargonemProfileImportService"
) {}

export const use = serviceUse(Service);

export const layer = Layer.succeed(Service, { preview });
