import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

import { parseAppUserId } from "../app-user-id.js";
import { FirecrawlClientService } from "../firecrawl-client-service.js";
import type { FirecrawlClient } from "../firecrawl-client.js";
import { FirecrawlConfigService } from "../firecrawl-config.js";
import { isOk, ok } from "../result.js";
import { makeAccountImportStoreServiceTestService } from "../squad-groups/squad-group-store.test-support.js";
import { AccountImportStoreService } from "./account-import-store-service.js";
import { PreviewMargonemProfileImportService } from "./preview-margonem-profile-import-service.js";

const parseTestUserId = () => {
  const userId = parseAppUserId("effect-preview-user");

  if (!isOk(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
};

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
      Promise.resolve(
        ok({
          html: htmlWithJarunaCharacter,
          metadata: {
            cacheState: "hit",
            creditsUsed: 1,
            statusCode: 200,
          },
        })
      ),
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
  const service = new PreviewMargonemProfileImportService();

  return Effect.gen(function* previewEffect() {
    const preview = yield* service.preview({
      actorUserId,
      profileUrl: "https://www.margonem.pl/profile/view,7298897",
    });

    expect(preview).toMatchObject({
      generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
      suggestedAccountName: "informati",
    });
    expect(preview.jarunaCharacters).toHaveLength(1);
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
