import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAppUserId } from "../app-user-id";
import type { FirecrawlCreditCount } from "../firecrawl-config";
import { parseMargonemProfileId } from "../margonem-profile-id";
import { isOk } from "../result";
import { makeEffectSquadGroupStoreTestService } from "../squad-groups/effect-squad-group-store.test-support";
import { EffectSquadGroupStore } from "../squad-groups/squad-group-store";
import { EffectPreviewOwnedAccountImports } from "./effect-preview-owned-account-imports";
import type { EffectSingleMargonemProfilePreview } from "./effect-preview-owned-account-imports";
import type {
  Clock,
  PreviewMargonemProfileImportOutput,
} from "./preview-margonem-profile-import";

const parseTestUserId = () => {
  const userId = parseAppUserId("effect-batch-user");

  if (!isOk(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
};

const parseTestProfileId = (value = 7_298_897) => {
  const profileId = parseMargonemProfileId(value);

  if (!isOk(profileId)) {
    throw new Error("Expected test profile id to be valid");
  }

  return profileId.value;
};

const fixedClock: Clock = {
  now: () => new Date("2026-06-29T12:00:00.000Z"),
};

const successfulPreview = (
  profileId = parseTestProfileId()
): PreviewMargonemProfileImportOutput => ({
  firecrawlCreditsUsed: 1 as FirecrawlCreditCount,
  generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
  jarunaCharacters: [
    {
      avatarUrl: null,
      characterId: 1_296_625 as never,
      level: 315 as never,
      name: "informati",
      profession: "tracker",
      world: "jaruna",
    },
  ],
  lastFetchedAt: new Date("2026-06-29T12:00:00.000Z"),
  profileId,
  suggestedAccountName: "informati",
});

it.effect(
  "previews owned account imports and persists successful lines through Effect services",
  () => {
    const actorUserId = parseTestUserId();
    const singlePreview: EffectSingleMargonemProfilePreview = {
      preview: () => Effect.succeed(successfulPreview()),
    };
    const store = makeEffectSquadGroupStoreTestService({
      createPendingImport: (input) =>
        Effect.succeed({ id: 123 as never, profileId: input.profileId }),
      findProfileAccessState: () => Effect.succeed({ _tag: "Available" }),
    });
    const service = new EffectPreviewOwnedAccountImports(
      singlePreview,
      fixedClock
    );

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
    }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
  }
);
