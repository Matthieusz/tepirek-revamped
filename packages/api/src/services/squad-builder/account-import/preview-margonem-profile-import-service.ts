import * as ClockRuntime from "effect/Clock";
import * as Context from "effect/Context";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { firecrawlYearMonthFromDate } from "../../../domain/squad-builder/firecrawl-year-month.ts";
import type { MargonemCharacterPreview } from "../../../domain/squad-builder/margonem-character.ts";
import { parseMargonemProfileHtml } from "../../../domain/squad-builder/margonem-profile-html-parser.ts";
import type { ParseMargonemProfileHtmlError } from "../../../domain/squad-builder/margonem-profile-html-parser.ts";
import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import {
  parseMargonemProfileUrl,
  toMargonemProfileUrl,
} from "../../../domain/squad-builder/margonem-profile-url.ts";
import type { ParseMargonemProfileUrlError } from "../../../domain/squad-builder/margonem-profile-url.ts";
import {
  FirecrawlClientService,
  FirecrawlResponseNotParseable,
} from "../firecrawl-client.ts";
import type { FirecrawlScrapeError } from "../firecrawl-client.ts";
import {
  FirecrawlConfigService,
  parseFirecrawlCreditCount,
} from "../firecrawl-config.ts";
import type { FirecrawlCreditCount } from "../firecrawl-config.ts";
import {
  MargonemAccountAlreadyOwnedByActor,
  MargonemAccountAlreadySharedWithActor,
  MargonemAccountOwnedByAnotherUser,
} from "../squad-groups/squad-group-errors.ts";
import { AccountImportStoreService } from "./account-import-store-service.ts";
import type {
  DuplicateMargonemAccountError,
  FirecrawlBudgetError,
  ProfileAccessState,
  SquadBuilderPersistenceUnavailable,
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

const profileAccessStateToDuplicateError = (
  state: ProfileAccessState
): DuplicateMargonemAccountError | undefined => {
  switch (state._tag) {
    case "Available": {
      return undefined;
    }
    case "OwnedByActor": {
      return new MargonemAccountAlreadyOwnedByActor();
    }
    case "OwnedByAnotherUser": {
      return new MargonemAccountOwnedByAnotherUser();
    }
    case "SharedWithActor": {
      return new MargonemAccountAlreadySharedWithActor();
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
export const makePreviewMargonemProfileImport = (
  store: typeof AccountImportStoreService.Service,
  config: typeof FirecrawlConfigService.Service,
  firecrawl: typeof FirecrawlClientService.Service
) =>
  EffectRuntime.fn("AccountImport.previewProfile")(function* previewEffect(
    input: PreviewMargonemProfileImportInput
  ) {
    const profileId = yield* parseMargonemProfileUrl(input.profileUrl);
    const accessState = yield* store.findProfileAccessState({
      actorUserId: input.actorUserId,
      profileId,
    });
    const duplicateError = profileAccessStateToDuplicateError(accessState);

    if (duplicateError !== undefined) {
      return yield* duplicateError;
    }

    const requestTimeMillis = yield* ClockRuntime.currentTimeMillis;
    const yearMonth = firecrawlYearMonthFromDate(new Date(requestTimeMillis));
    const reservedRequest = yield* store.reserveRequest({
      monthlyRequestBudget: config.monthlyRequestBudget,
      profileId,
      requestedByUserId: input.actorUserId,
      yearMonth,
    });
    const scrapedProfile = yield* firecrawl.scrapeProfileHtml(profileId).pipe(
      EffectRuntime.catch((error) =>
        EffectRuntime.gen(function* markRequestFailed() {
          const completedAt = yield* currentDate;
          yield* store.markRequestFailed({
            completedAt,
            errorTag: error._tag,
            requestId: reservedRequest.requestId,
          });
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
          yield* store.markRequestFailed({
            completedAt,
            errorTag: "FirecrawlResponseNotParseable",
            requestId: reservedRequest.requestId,
          });
          return yield* new FirecrawlResponseNotParseable({
            cause: new Error("Invalid Firecrawl creditsUsed"),
            profileId,
          });
        })
      )
    );

    const completedAt = yield* currentDate;
    yield* store.markRequestSucceeded({
      cacheState: scrapedProfile.metadata.cacheState ?? null,
      completedAt,
      creditsUsed,
      firecrawlStatusCode: scrapedProfile.metadata.statusCode ?? null,
      requestId: reservedRequest.requestId,
    });

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
  });

/** Integration seam that resolves dependencies from the Effect context. */
export const preview = (input: PreviewMargonemProfileImportInput) =>
  EffectRuntime.gen(function* previewIntegration() {
    const store = yield* AccountImportStoreService;
    const config = yield* FirecrawlConfigService;
    const firecrawl = yield* FirecrawlClientService;
    return yield* makePreviewMargonemProfileImport(
      store,
      config,
      firecrawl
    )(input);
  });

export interface PreviewMargonemProfileImport {
  readonly preview: ReturnType<typeof makePreviewMargonemProfileImport>;
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
    return {
      preview: makePreviewMargonemProfileImport(store, config, firecrawl),
    };
  })
);
