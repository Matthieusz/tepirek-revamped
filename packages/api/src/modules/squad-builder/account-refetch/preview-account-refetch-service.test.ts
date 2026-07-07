import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.js";
import { FirecrawlClientService } from "../firecrawl-client-service.js";
import type { FirecrawlClient } from "../firecrawl-client.js";
import type { FirecrawlCreditCount } from "../firecrawl-config.js";
import { FirecrawlConfigService } from "../firecrawl-config.js";
import { makeAccountRefetchStoreServiceTestService } from "../squad-groups/squad-group-store.test-support.js";
import { AccountRefetchStoreService } from "./account-refetch-store-service.js";
import { preview } from "./preview-account-refetch-service.js";

const parseTestUserId = () =>
  Effect.runSync(parseAppUserId("effect-refetch-user"));

const htmlWithUpdatedJarunaCharacter = `
  <div class="profile-header__name"><span>informati</span></div>
  <li data-nick="informati" data-lvl="316" data-world="#jaruna" class="char-row" data-id="1296625">
    <span class="cimg" style="background-image: url('https://example.com/avatar.gif');"></span>
    <span class="character-prof">Tropiciel,</span>
  </li>
`;

it.effect("previews account refetch and stores the pending diff", () => {
  const actorUserId = parseTestUserId();
  const createdPendingIds: number[] = [];
  const firecrawl: FirecrawlClient = {
    scrapeProfileHtml: () =>
      Promise.resolve({
        html: htmlWithUpdatedJarunaCharacter,
        metadata: {
          cacheState: "miss",
          creditsUsed: 1,
          statusCode: 200,
        },
      }),
  };
  const store = makeAccountRefetchStoreServiceTestService({
    createPendingRefetch: (input) => {
      expect(input.latestCharacters).toHaveLength(1);
      expect(input.diff.changed).toHaveLength(1);
      createdPendingIds.push(456);
      return Effect.succeed({ id: 456 as never });
    },
    getAccountForRefetch: (input) =>
      Effect.succeed({
        accountId: input.accountId,
        currentCharacters: [
          {
            affectedSquadCount: 0,
            avatarUrl: null,
            databaseCharacterId: 10,
            level: 315 as never,
            margonemCharacterId: 1_296_625 as never,
            name: "informati",
            profession: "tracker",
            world: "jaruna",
          },
        ],
        displayName: "informati" as never,
        profileId: 7_298_897 as never,
      }),
    markRequestSucceeded: () => Effect.void,
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

  return Effect.gen(function* previewRefetchEffect() {
    const refetchPreview = yield* service.preview({
      accountId: 123 as never,
      actorUserId,
    });

    expect(refetchPreview).toMatchObject({
      accountId: 123,
      firecrawlCreditsUsed: 1 as FirecrawlCreditCount,
      generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
      refetchPreviewId: 456,
    });
    expect(refetchPreview.diff.changed).toHaveLength(1);
    expect(createdPendingIds).toEqual([456]);
  }).pipe(
    Effect.provideService(FirecrawlConfigService)({
      apiKey: Redacted.make("test-key"),
      monthlyRequestBudget: 900,
    }),
    Effect.provideService(FirecrawlClientService)(firecrawl),
    Effect.provideService(AccountRefetchStoreService)(store)
  );
});
