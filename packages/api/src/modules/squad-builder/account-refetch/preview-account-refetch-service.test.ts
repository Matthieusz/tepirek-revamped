import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

import { parseAppUserId } from "../app-user-id.js";
import { EffectFirecrawlClient } from "../effect-firecrawl-client.js";
import type { FirecrawlClient } from "../firecrawl-client.js";
import type { FirecrawlCreditCount } from "../firecrawl-config.js";
import { EffectFirecrawlConfig } from "../firecrawl-config.js";
import { isOk, ok } from "../result.js";
import { makeEffectAccountRefetchStoreTestService } from "../squad-groups/effect-squad-group-store.test-support.js";
import { EffectAccountRefetchStore } from "./account-refetch-store-service.js";
import { EffectPreviewAccountRefetch } from "./preview-account-refetch-service.js";

const parseTestUserId = () => {
  const userId = parseAppUserId("effect-refetch-user");

  if (!isOk(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
};

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
      Promise.resolve(
        ok({
          html: htmlWithUpdatedJarunaCharacter,
          metadata: {
            cacheState: "miss",
            creditsUsed: 1,
            statusCode: 200,
          },
        })
      ),
  };
  const store = makeEffectAccountRefetchStoreTestService({
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
  const service = new EffectPreviewAccountRefetch();

  return Effect.gen(function* previewRefetchEffect() {
    const preview = yield* service.preview({
      accountId: 123 as never,
      actorUserId,
    });

    expect(preview).toMatchObject({
      accountId: 123,
      firecrawlCreditsUsed: 1 as FirecrawlCreditCount,
      generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
      refetchPreviewId: 456,
    });
    expect(preview.diff.changed).toHaveLength(1);
    expect(createdPendingIds).toEqual([456]);
  }).pipe(
    Effect.provideService(EffectFirecrawlConfig)({
      apiKey: Redacted.make("test-key"),
      monthlyRequestBudget: 900,
    }),
    Effect.provideService(EffectFirecrawlClient)(firecrawl),
    Effect.provideService(EffectAccountRefetchStore)(store)
  );
});
