import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import {
  makeAccountImportStoreServiceTestService,
  makeFirecrawlRequestAccountingStoreServiceTestService,
} from "../../../test/squad-builder/squad-group-store.ts";
import { FirecrawlClientService } from "../firecrawl-client.ts";
import type { FirecrawlClient } from "../firecrawl-client.ts";
import { FirecrawlConfigService } from "../firecrawl-config.ts";
import { FirecrawlRequestAccountingStoreService } from "../firecrawl-request-accounting-store.ts";
import {
  MargonemAccountAlreadyOwnedByActor,
  MargonemAccountOwnedByAnotherUser,
  MargonemAccountAlreadySharedWithActor,
} from "../squad-groups/squad-group-errors.ts";
import {
  AccountImportStoreService,
  ProfileAccessState,
} from "./account-import-store.ts";
import { preview } from "./preview-margonem-profile-import-service.ts";

const parseTestUserId = () =>
  Effect.runSync(parseAppUserId("effect-preview-user"));

const htmlWithJarunaCharacter = `
  <div class="profile-header__name"><span>informati</span></div>
  <li data-nick="informati" data-lvl="315" data-world="#jaruna" class="char-row" data-id="1296625">
    <span class="cimg" style="background-image: url('https://example.com/avatar.gif');"></span>
    <span class="character-prof">Tropiciel,</span>
  </li>
`;

it.effect("previews an available Margonem profile through services", () => {
  const actorUserId = parseTestUserId();
  const succeededRequestIds: number[] = [];

  const firecrawl: FirecrawlClient = {
    scrapeProfileHtml: () =>
      Effect.succeed({
        html: htmlWithJarunaCharacter,
        metadata: {
          cacheState: "hit",
          creditsUsed: 1,
          statusCode: 200,
        },
      }),
    scrapeUrlHtml: () =>
      Effect.die(new Error("URL scraping is not used by this test")),
  };

  const store = makeAccountImportStoreServiceTestService({
    findProfileAccessState: () =>
      Effect.succeed(ProfileAccessState.Available()),
  });

  const requestAccounting =
    makeFirecrawlRequestAccountingStoreServiceTestService({
      markRequestSucceeded: (input) => {
        succeededRequestIds.push(input.requestId);

        return Effect.void;
      },
      reserveRequest: (input) =>
        Effect.succeed({
          budgetState: {
            monthlyRequestBudget: input.monthlyRequestBudget,
            remainingRequests: input.monthlyRequestBudget - 1,
            usedRequests: 1,
            yearMonth: input.yearMonth,
          },
          requestId: 123,
        }),
    });

  return Effect.gen(function* previewEffect() {
    const profilePreview = yield* preview({
      actorUserId,
      profileUrl: "https://www.margonem.pl/profile/view,7298897",
    });

    expect(profilePreview).toMatchObject({
      generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
      suggestedAccountName: "informati",
    });
    expect(profilePreview.jarunaCharacters).toHaveLength(1);
    expect(succeededRequestIds).toEqual([123]);
  }).pipe(
    Effect.provideService(FirecrawlConfigService)({
      apiKey: Redacted.make("test-key"),
      monthlyRequestBudget: 900,
      perUserMonthlyRequestBudget: 100,
    }),
    Effect.provideService(FirecrawlClientService)(firecrawl),
    Effect.provideService(AccountImportStoreService)(store),
    Effect.provideService(FirecrawlRequestAccountingStoreService)(
      requestAccounting
    )
  );
});

for (const scenario of [
  "invalid",
  "owned",
  "other-owner",
  "shared",
  "html",
] as const) {
  it.effect(`preserves workflow boundary: ${scenario}`, () =>
    Effect.gen(function* lifecycleCase1() {
      const actorUserId = parseTestUserId();

      const reservations: number[] = [];
      const scrapes: number[] = [];
      const successes: number[] = [];
      const failures: string[] = [];

      const store = makeAccountImportStoreServiceTestService({
        findProfileAccessState: () => {
          if (scenario === "owned") {
            return Effect.succeed(ProfileAccessState.OwnedByActor());
          }

          if (scenario === "other-owner") {
            return Effect.succeed(ProfileAccessState.OwnedByAnotherUser());
          }

          if (scenario === "shared") {
            return Effect.succeed(ProfileAccessState.SharedWithActor());
          }

          return Effect.succeed(ProfileAccessState.Available());
        },
      });

      const accounting = makeFirecrawlRequestAccountingStoreServiceTestService({
        markRequestFailed: (input) =>
          Effect.sync(() => {
            failures.push(input.errorTag);
          }),
        markRequestSucceeded: (input) =>
          Effect.sync(() => {
            successes.push(input.requestId);
          }),
        reserveRequest: (input) =>
          Effect.sync(() => {
            reservations.push(123);

            return {
              budgetState: {
                monthlyRequestBudget: input.monthlyRequestBudget,
                remainingRequests: 899,
                usedRequests: 1,
                yearMonth: input.yearMonth,
              },
              requestId: 123,
            };
          }),
      });

      const error = yield* Effect.flip(
        preview({
          actorUserId,
          profileUrl:
            scenario === "invalid"
              ? "invalid"
              : "https://www.margonem.pl/profile/view,7298897",
        }).pipe(
          Effect.provideService(AccountImportStoreService)(store),
          Effect.provideService(FirecrawlConfigService)({
            apiKey: Redacted.make("test-key"),
            monthlyRequestBudget: 900,
            perUserMonthlyRequestBudget: 100,
          }),
          Effect.provideService(FirecrawlClientService)({
            scrapeProfileHtml: (id) =>
              Effect.sync(() => {
                scrapes.push(id);

                return { html: "invalid", metadata: {} };
              }),
            scrapeUrlHtml: () => Effect.die(new Error("Unexpected URL scrape")),
          }),
          Effect.provideService(FirecrawlRequestAccountingStoreService)(
            accounting
          )
        )
      );

      const scraped = scenario === "html";
      expect(reservations).toEqual(scraped ? [123] : []);
      expect(scrapes).toEqual(scraped ? [7_298_897] : []);
      expect(successes).toEqual(scraped ? [123] : []);
      expect(failures).toEqual([]);

      if (scenario === "html") {
        expect(error).toHaveProperty("_tag", "MargonemProfileNameNotFound");
      }

      if (scenario === "owned") {
        expect(error).toBeInstanceOf(MargonemAccountAlreadyOwnedByActor);
      }

      if (scenario === "other-owner") {
        expect(error).toBeInstanceOf(MargonemAccountOwnedByAnotherUser);
      }

      if (scenario === "shared") {
        expect(error).toBeInstanceOf(MargonemAccountAlreadySharedWithActor);
      }
    })
  );
}
