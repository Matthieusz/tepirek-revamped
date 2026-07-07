import * as ClockRuntime from "effect/Clock";
import * as Context from "effect/Context";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import { firecrawlYearMonthFromDate } from "../../../domain/squad-builder/firecrawl-year-month.js";
import { parseMargonemProfileHtml } from "../../../domain/squad-builder/margonem-profile-html-parser.js";
import {
  parseMargonemProfileUrl,
  toMargonemProfileUrl,
} from "../../../domain/squad-builder/margonem-profile-url.js";
import { serviceUse } from "../../../effect/service-use.js";
import {
  FirecrawlClientService,
  FirecrawlResponseNotParseable,
} from "../firecrawl-client.js";
import type { FirecrawlScrapeError } from "../firecrawl-client.js";
import {
  FirecrawlConfigService,
  parseFirecrawlCreditCount,
} from "../firecrawl-config.js";
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
    const profileId = yield* parseMargonemProfileUrl(input.profileUrl);
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
    const scrapedProfile = yield* EffectRuntime.tryPromise({
      catch: (cause: unknown) =>
        cause as FirecrawlScrapeError satisfies FirecrawlScrapeError,
      try: () => firecrawl.scrapeProfileHtml(profileId, options),
    }).pipe(
      EffectRuntime.catch((error) =>
        AccountImportStoreService.use((store) =>
          store.markRequestFailed({
            errorTag: error._tag,
            requestId: reservedRequest.requestId,
          })
        ).pipe(EffectRuntime.andThen(EffectRuntime.fail(error)))
      )
    );

    const creditsUsed = yield* parseFirecrawlCreditCount(
      scrapedProfile.metadata.creditsUsed ?? 1
    ).pipe(
      EffectRuntime.catch(() =>
        AccountImportStoreService.use((store) =>
          store.markRequestFailed({
            errorTag: "FirecrawlResponseNotParseable",
            requestId: reservedRequest.requestId,
          })
        ).pipe(
          EffectRuntime.andThen(
            EffectRuntime.fail(
              new FirecrawlResponseNotParseable({
                cause: new Error("Invalid Firecrawl creditsUsed"),
                profileId,
              })
            )
          )
        )
      )
    );

    yield* AccountImportStoreService.use((store) =>
      store.markRequestSucceeded({
        cacheState: scrapedProfile.metadata.cacheState ?? null,
        creditsUsed,
        firecrawlStatusCode: scrapedProfile.metadata.statusCode ?? null,
        requestId: reservedRequest.requestId,
      })
    );

    const parsedHtml = yield* parseMargonemProfileHtml({
      html: scrapedProfile.html,
      profileId,
    });

    const fetchedTimeMillis = yield* ClockRuntime.currentTimeMillis;

    return {
      firecrawlCreditsUsed: creditsUsed,
      generatedProfileUrl: toMargonemProfileUrl(profileId),
      jarunaCharacters: parsedHtml.jarunaCharacters,
      lastFetchedAt: new Date(fetchedTimeMillis),
      profileId,
      suggestedAccountName: parsedHtml.suggestedAccountName,
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

export const layer = Layer.effect(
  Service,
  EffectRuntime.gen(function* layer() {
    yield* AccountImportStoreService;
    yield* FirecrawlConfigService;
    yield* FirecrawlClientService;
    return { preview };
  })
);
