import { expect, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Redacted from "effect/Redacted";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { FirecrawlClientService } from "../firecrawl-client.ts";
import type { FirecrawlClient } from "../firecrawl-client.ts";
import { FirecrawlConfigService } from "../firecrawl-config.ts";
import { makeAccountImportStoreServiceTestService } from "../squad-groups/squad-group-store.test-support.ts";
import { AccountImportStoreService } from "./account-import-store-service.ts";
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
  };
  const store = makeAccountImportStoreServiceTestService({
    findProfileAccessState: () => Effect.succeed({ _tag: "Available" }),
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
  const service = { preview };

  return Effect.gen(function* previewEffect() {
    const profilePreview = yield* service.preview({
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
    }),
    Effect.provideService(FirecrawlClientService)(firecrawl),
    Effect.provideService(AccountImportStoreService)(store)
  );
});

it.effect("marks a reserved import request failed when interrupted", () =>
  Effect.gen(function* interruptedImport() {
    const actorUserId = parseTestUserId();
    const scrapeStarted = yield* Deferred.make<boolean>();
    const pendingScrape = yield* Deferred.make<never>();
    const failedRequests: { errorTag: string; requestId: number }[] = [];
    const firecrawl: FirecrawlClient = {
      scrapeProfileHtml: () =>
        Deferred.succeed(scrapeStarted, true).pipe(
          Effect.andThen(Deferred.await(pendingScrape))
        ),
    };
    const store = makeAccountImportStoreServiceTestService({
      findProfileAccessState: () => Effect.succeed({ _tag: "Available" }),
      markRequestFailed: (input) =>
        Effect.sync(() => {
          failedRequests.push(input);
        }),
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
    const operation = preview({
      actorUserId,
      profileUrl: "https://www.margonem.pl/profile/view,7298897",
    }).pipe(
      Effect.provideService(FirecrawlConfigService)({
        apiKey: Redacted.make("test-key"),
        monthlyRequestBudget: 900,
      }),
      Effect.provideService(FirecrawlClientService)(firecrawl),
      Effect.provideService(AccountImportStoreService)(store)
    );
    const fiber = yield* Effect.forkChild(operation);

    yield* Deferred.await(scrapeStarted);
    yield* Fiber.interrupt(fiber);
    const exit = yield* Fiber.await(fiber);

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(exit.cause.reasons.some(Cause.isInterruptReason)).toBe(true);
    }
    expect(failedRequests).toHaveLength(1);
    expect(failedRequests[0]).toMatchObject({
      errorTag: "Interrupted",
      requestId: 123,
    });
  })
);
