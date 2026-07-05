import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

import { parseAppUserId } from "../app-user-id.js";
import { FirecrawlClientService } from "../firecrawl-client-service.js";
import type { FirecrawlClient } from "../firecrawl-client.js";
import { FirecrawlConfigService } from "../firecrawl-config.js";
import { success } from "../outcome.js";
import { makeAccountImportStoreServiceTestService } from "../squad-groups/squad-group-store.test-support.js";
import { AccountImportStoreService } from "./account-import-store-service.js";
import { preview } from "./preview-owned-account-imports-service.js";

const parseTestUserId = () =>
  Effect.runSync(parseAppUserId("effect-batch-user"));

const htmlWithJarunaCharacter = `
  <div class="profile-header__name"><span>informati</span></div>
  <li data-nick="informati" data-lvl="315" data-world="#jaruna" class="char-row" data-id="1296625">
    <span class="cimg"></span>
    <span class="character-prof">Tropiciel,</span>
  </li>
`;

it.effect(
  "previews owned account imports and persists successful lines through services",
  () => {
    const actorUserId = parseTestUserId();
    const firecrawl: FirecrawlClient = {
      scrapeProfileHtml: () =>
        Promise.resolve(
          success({
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
    const service = { preview };

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
      Effect.provideService(FirecrawlConfigService)({
        apiKey: Redacted.make("test-key"),
        monthlyRequestBudget: 900,
      }),
      Effect.provideService(FirecrawlClientService)(firecrawl),
      Effect.provideService(AccountImportStoreService)(store)
    );
  }
);
