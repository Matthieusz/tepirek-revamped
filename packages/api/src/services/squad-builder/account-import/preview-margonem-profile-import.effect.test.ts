import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.js";
import { FirecrawlClientService } from "../../../modules/squad-builder/firecrawl-client-service.js";
import type { FirecrawlClient } from "../../../modules/squad-builder/firecrawl-client.js";
import { FirecrawlConfigService } from "../../../modules/squad-builder/firecrawl-config.js";
import { makeAccountImportStoreServiceTestService } from "../squad-groups/squad-group-store.test-support.js";
import { AccountImportStoreService } from "./account-import-store-service.js";
import { preview } from "./preview-margonem-profile-import-service.js";

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
      Promise.resolve({
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
