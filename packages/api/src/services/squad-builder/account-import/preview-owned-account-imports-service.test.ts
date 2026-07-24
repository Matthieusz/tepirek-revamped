import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parsePendingMargonemAccountImportId } from "../../../domain/squad-builder/pending-margonem-account-import-id.ts";
import { makeAccountImportStoreServiceTestService } from "../../../test/squad-builder/squad-group-store.ts";
import { FirecrawlClientService } from "../firecrawl-client.ts";
import type { FirecrawlClient } from "../firecrawl-client.ts";
import { FirecrawlConfigService } from "../firecrawl-config.ts";
import { AccountImportStoreService } from "./account-import-store-service.ts";
import { preview } from "./preview-owned-account-imports-service.ts";

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
    const pendingImportId = Effect.runSync(
      parsePendingMargonemAccountImportId(123)
    );
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
      createPendingImport: (input) =>
        Effect.succeed({ id: pendingImportId, profileId: input.profileId }),
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
