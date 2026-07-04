import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

import { parseAppUserId } from "../app-user-id.js";
import { EffectFirecrawlClient } from "../effect-firecrawl-client.js";
import type { FirecrawlClient } from "../firecrawl-client.js";
import { EffectFirecrawlConfig } from "../firecrawl-config.js";
import { isOk, ok } from "../result.js";
import { makeEffectAccountImportStoreTestService } from "../squad-groups/effect-squad-group-store.test-support.js";
import { EffectAccountImportStore } from "./account-import-store-service.js";
import { EffectPreviewOwnedAccountImports } from "./preview-owned-account-imports-service.js";

const parseTestUserId = () => {
  const userId = parseAppUserId("effect-batch-user");

  if (!isOk(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
};

const htmlWithJarunaCharacter = `
  <div class="profile-header__name"><span>informati</span></div>
  <li data-nick="informati" data-lvl="315" data-world="#jaruna" class="char-row" data-id="1296625">
    <span class="cimg"></span>
    <span class="character-prof">Tropiciel,</span>
  </li>
`;

it.effect(
  "previews owned account imports and persists successful lines through Effect services",
  () => {
    const actorUserId = parseTestUserId();
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
    const store = makeEffectAccountImportStoreTestService({
      createPendingImport: (input) =>
        Effect.succeed({ id: 123 as never, profileId: input.profileId }),
      findProfileAccessState: () => Effect.succeed({ _tag: "Available" }),
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
    const service = new EffectPreviewOwnedAccountImports();

    return Effect.gen(function* previewBatchEffect() {
      const output = yield* service.preview({
        actorUserId,
        profileUrls: [
          "https://www.margonem.pl/profile/view,7298897",
          "https://www.margonem.pl/profile/view,7298897",
        ],
      });

      expect(output.items).toHaveLength(2);
      expect(output.items[0]).toMatchObject({
        _tag: "PreviewSucceeded",
        pendingImportId: 123,
        suggestedAccountName: "informati",
      });
      expect(output.items[1]).toMatchObject({
        _tag: "PreviewFailed",
        error: { _tag: "DuplicateProfileInBatch" },
      });
    }).pipe(
      Effect.provideService(EffectFirecrawlConfig)({
        apiKey: Redacted.make("test-key"),
        monthlyRequestBudget: 900,
      }),
      Effect.provideService(EffectFirecrawlClient)(firecrawl),
      Effect.provideService(EffectAccountImportStore)(store)
    );
  }
);
