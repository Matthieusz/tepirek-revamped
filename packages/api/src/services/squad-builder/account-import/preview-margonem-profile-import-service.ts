import * as ClockRuntime from "effect/Clock";
import * as Context from "effect/Context";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import { firecrawlYearMonthFromDate } from "../../../domain/squad-builder/firecrawl-year-month.js";
import type { MargonemCharacterPreview } from "../../../domain/squad-builder/margonem-character.js";
import { parseMargonemProfileHtml } from "../../../domain/squad-builder/margonem-profile-html-parser.js";
import type { ParseMargonemProfileHtmlError } from "../../../domain/squad-builder/margonem-profile-html-parser.js";
import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.js";
import {
  parseMargonemProfileUrl,
  toMargonemProfileUrl,
} from "../../../domain/squad-builder/margonem-profile-url.js";
import type { ParseMargonemProfileUrlError } from "../../../domain/squad-builder/margonem-profile-url.js";
import {
  FirecrawlClientService,
  FirecrawlResponseNotParseable,
} from "../firecrawl-client.js";
import type { FirecrawlScrapeError } from "../firecrawl-client.js";
import {
  FirecrawlConfigService,
  parseFirecrawlCreditCount,
} from "../firecrawl-config.js";
import type { FirecrawlCreditCount } from "../firecrawl-config.js";
import { AccountImportStoreService } from "./account-import-store-service.js";
import type {
  DuplicateMargonemAccountError,
  FirecrawlBudgetError,
  ProfileAccessState,
  SquadBuilderPersistenceUnavailable,
} from "./account-import-store.js";

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

const profileAccessStateToDuplicateError = (
  state: ProfileAccessState
): DuplicateMargonemAccountError | undefined => {
  switch (state._tag) {
    case "Available": {
      return undefined;
    }
    case "OwnedByActor": {
      return { _tag: "MargonemAccountAlreadyOwnedByActor" };
    }
    case "OwnedByAnotherUser": {
      return { _tag: "MargonemAccountOwnedByAnotherUser" };
    }
    case "SharedWithActor": {
      return { _tag: "MargonemAccountAlreadySharedWithActor" };
    }
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
};

const currentDate = ClockRuntime.currentTimeMillis.pipe(
  EffectRuntime.map((milliseconds) => new Date(milliseconds))
);

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
    const scrapedProfile = yield* firecrawl
      .scrapeProfileHtml(profileId, options)
      .pipe(
        EffectRuntime.catch((error) =>
          EffectRuntime.gen(function* markRequestFailed() {
            const completedAt = yield* currentDate;
            yield* AccountImportStoreService.use((store) =>
              store.markRequestFailed({
                completedAt,
                errorTag: error._tag,
                requestId: reservedRequest.requestId,
              })
            );
            return yield* error;
          })
        )
      );

    const creditsUsed = yield* parseFirecrawlCreditCount(
      scrapedProfile.metadata.creditsUsed ?? 1
    ).pipe(
      EffectRuntime.catch(() =>
        EffectRuntime.gen(function* markInvalidResponseFailed() {
          const completedAt = yield* currentDate;
          yield* AccountImportStoreService.use((store) =>
            store.markRequestFailed({
              completedAt,
              errorTag: "FirecrawlResponseNotParseable",
              requestId: reservedRequest.requestId,
            })
          );
          return yield* new FirecrawlResponseNotParseable({
            cause: new Error("Invalid Firecrawl creditsUsed"),
            profileId,
          });
        })
      )
    );

    const completedAt = yield* currentDate;
    yield* AccountImportStoreService.use((store) =>
      store.markRequestSucceeded({
        cacheState: scrapedProfile.metadata.cacheState ?? null,
        completedAt,
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

const makePreview = (
  store: typeof AccountImportStoreService.Service,
  config: typeof FirecrawlConfigService.Service,
  firecrawl: typeof FirecrawlClientService.Service
) =>
  EffectRuntime.fn("AccountImport.previewProfile")(
    (
      input: PreviewMargonemProfileImportInput,
      options: { readonly signal?: AbortSignal } = {}
    ) =>
      preview(input, options).pipe(
        EffectRuntime.provideService(AccountImportStoreService, store),
        EffectRuntime.provideService(FirecrawlConfigService, config),
        EffectRuntime.provideService(FirecrawlClientService, firecrawl)
      )
  );

export interface PreviewMargonemProfileImport {
  readonly preview: ReturnType<typeof makePreview>;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class PreviewMargonemProfileImportService extends Context.Service<
  PreviewMargonemProfileImportService,
  PreviewMargonemProfileImport
>()(
  "@tepirek-revamped/api/squad-builder/PreviewMargonemProfileImportService"
) {}

export const layer = Layer.effect(
  PreviewMargonemProfileImportService,
  EffectRuntime.gen(function* layer() {
    const store = yield* AccountImportStoreService;
    const config = yield* FirecrawlConfigService;
    const firecrawl = yield* FirecrawlClientService;
    return { preview: makePreview(store, config, firecrawl) };
  })
);
