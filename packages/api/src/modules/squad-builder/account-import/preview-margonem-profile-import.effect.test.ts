import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAppUserId } from "../app-user-id.js";
import { EffectFirecrawlClient } from "../effect-firecrawl-client.js";
import type { FirecrawlClient } from "../firecrawl-client.js";
import { EffectFirecrawlConfig } from "../firecrawl-config.js";
import { Redacted } from "../prelude.js";
import { isOk, ok } from "../result.js";
import { makeEffectAccountImportStoreTestService } from "../squad-groups/effect-squad-group-store.test-support.js";
import { EffectAccountImportStore } from "./effect-account-import-store.js";
import { EffectPreviewMargonemProfileImport } from "./effect-preview-margonem-profile-import.js";

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

it.effect(
  "previews an available Margonem profile through Effect services",
  () => {
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
    const store = makeEffectAccountImportStoreTestService({
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
    const service = new EffectPreviewMargonemProfileImport();

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
      Effect.provideService(EffectFirecrawlConfig)({
        apiKey: Redacted("test-key"),
        monthlyRequestBudget: 900,
      }),
      Effect.provideService(EffectFirecrawlClient)(firecrawl),
      Effect.provideService(EffectAccountImportStore)(store)
    );
  }
);
