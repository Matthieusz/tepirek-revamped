import { describe, expect, it } from "vitest";

import { parseAppUserId } from "../app-user-id.js";
import type { AppUserId } from "../app-user-id.js";
import type { FirecrawlCreditCount } from "../firecrawl-config.js";
import { parseMargonemProfileId } from "../margonem-profile-id.js";
import type { MargonemProfileId } from "../margonem-profile-id.js";
import { err, isError, isOk, ok } from "../result.js";
import type { Result } from "../result.js";
import type {
  CreatePendingMargonemAccountImportInput,
  PendingMargonemAccountImport,
  PendingMargonemAccountImportStore,
  ProfileAccessState,
  SquadBuilderAccountLookup,
} from "./account-import-store.js";
import type {
  PreviewMargonemProfileImportError,
  PreviewMargonemProfileImportOutput,
  Clock,
} from "./preview-margonem-profile-import.js";
import { PreviewOwnedAccountImports } from "./preview-owned-account-imports.js";
import type {
  PreviewOwnedAccountImportItem,
  PreviewOwnedAccountImportsOutput,
  SingleMargonemProfilePreview,
} from "./preview-owned-account-imports.js";

const parseTestUserId = (): AppUserId => {
  const userId = parseAppUserId("batch-user");

  if (!isOk(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
};

const parseTestProfileId = (value = 7_298_897): MargonemProfileId => {
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
  profileId: MargonemProfileId
): PreviewMargonemProfileImportOutput => ({
  firecrawlCreditsUsed: 1 as FirecrawlCreditCount,
  generatedProfileUrl: `https://www.margonem.pl/profile/view,${profileId}`,
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

const parseProfileIdFromUrl = (url: string): MargonemProfileId => {
  const id = Number(url.match(/view,(?<id>\d+)/u)?.groups?.id);
  return id as MargonemProfileId;
};

const createFakeSinglePreview = (
  outcomes: ReadonlyMap<
    number,
    Result<
      PreviewMargonemProfileImportOutput,
      PreviewMargonemProfileImportError
    >
  >
): SingleMargonemProfilePreview & {
  readonly requestedUrls: string[];
} => {
  const requestedUrls: string[] = [];

  return {
    preview: (input) => {
      requestedUrls.push(input.profileUrl);
      const outcome = outcomes.get(parseProfileIdFromUrl(input.profileUrl));
      return Promise.resolve(
        outcome ??
          ok(successfulPreview(parseProfileIdFromUrl(input.profileUrl)))
      );
    },
    requestedUrls,
  };
};

const createFixedAccessLookup = (
  states: ReadonlyMap<number, ProfileAccessState>
): SquadBuilderAccountLookup & {
  readonly lookedUpProfileIds: number[];
} => {
  const lookedUpProfileIds: number[] = [];

  return {
    findProfileAccessState: ({ profileId }) => {
      lookedUpProfileIds.push(profileId);
      return Promise.resolve(
        ok(states.get(profileId) ?? { _tag: "Available" })
      );
    },
    lookedUpProfileIds,
  };
};

type RecordingPendingStore = PendingMargonemAccountImportStore & {
  readonly createdImports: CreatePendingMargonemAccountImportInput[];
};

const createRecordingPendingStore = (): RecordingPendingStore => {
  const createdImports: CreatePendingMargonemAccountImportInput[] = [];
  let nextId = 100;

  return {
    createPendingImport: (input) => {
      createdImports.push(input);
      nextId += 1;
      const pending: PendingMargonemAccountImport = {
        id: nextId as never,
        profileId: input.profileId,
      };
      return Promise.resolve(ok(pending));
    },
    createdImports,
    findPendingImportForConfirmation: () =>
      Promise.resolve(err({ _tag: "PendingMargonemAccountImportNotFound" })),
    markPendingImportConfirmed: () => Promise.resolve(ok()),
  };
};

const findItem = (
  output: PreviewOwnedAccountImportsOutput,
  lineNumber: number
): PreviewOwnedAccountImportItem | undefined =>
  output.items.find((item) => item.lineNumber === lineNumber);

describe("PreviewOwnedAccountImports", () => {
  it("rejects an empty profile URL batch before lookup or Firecrawl", async () => {
    const service = new PreviewOwnedAccountImports(
      createFakeSinglePreview(new Map()),
      createRecordingPendingStore(),
      createFixedAccessLookup(new Map()),
      fixedClock
    );

    const result = await service.preview({
      actorUserId: parseTestUserId(),
      profileUrls: ["  ", ""],
    });

    expect(isError(result)).toBe(true);

    if (!isError(result)) {
      throw new Error("Expected empty batch to fail");
    }

    expect(result.error._tag).toBe("EmptyProfileUrlBatch");
  });

  it("rejects batches above the configured max before lookup or Firecrawl", async () => {
    const lookup = createFixedAccessLookup(new Map());
    const single = createFakeSinglePreview(new Map());
    const service = new PreviewOwnedAccountImports(
      single,
      createRecordingPendingStore(),
      lookup,
      fixedClock
    );

    const tooMany = Array.from(
      { length: 21 },
      (_, index) => `https://www.margonem.pl/profile/view,${7_298_000 + index}`
    );

    const result = await service.preview({
      actorUserId: parseTestUserId(),
      profileUrls: tooMany,
    });

    expect(isError(result)).toBe(true);

    if (!isError(result)) {
      throw new Error("Expected oversized batch to fail");
    }

    expect(result.error._tag).toBe("TooManyProfileUrlsInBatch");
    expect(lookup.lookedUpProfileIds).toEqual([]);
    expect(single.requestedUrls).toEqual([]);
  });

  it("marks later duplicate profile URLs in the same batch without reserving budget", async () => {
    const single = createFakeSinglePreview(new Map());
    const lookup = createFixedAccessLookup(new Map());
    const pending = createRecordingPendingStore();
    const service = new PreviewOwnedAccountImports(
      single,
      pending,
      lookup,
      fixedClock
    );

    const url = "https://www.margonem.pl/profile/view,7298897";
    const result = await service.preview({
      actorUserId: parseTestUserId(),
      profileUrls: [url, url],
    });

    expect(isOk(result)).toBe(true);

    if (!isOk(result)) {
      throw new Error("Expected batch to succeed");
    }

    expect(single.requestedUrls).toEqual([url]);
    expect(pending.createdImports).toHaveLength(1);

    const duplicateItem = findItem(result.value, 2);

    expect(duplicateItem?._tag).toBe("PreviewFailed");

    if (duplicateItem?._tag === "PreviewFailed") {
      expect(duplicateItem.error._tag).toBe("DuplicateProfileInBatch");
    }
  });

  it("returns per-line duplicate account errors before reserving budget", async () => {
    const single = createFakeSinglePreview(new Map());
    const lookup = createFixedAccessLookup(
      new Map([[7_298_897, { _tag: "OwnedByActor" }]])
    );
    const pending = createRecordingPendingStore();
    const service = new PreviewOwnedAccountImports(
      single,
      pending,
      lookup,
      fixedClock
    );

    const result = await service.preview({
      actorUserId: parseTestUserId(),
      profileUrls: [
        "https://www.margonem.pl/profile/view,7298897",
        "https://www.margonem.pl/profile/view,7298898",
      ],
    });

    expect(isOk(result)).toBe(true);

    if (!isOk(result)) {
      throw new Error("Expected batch to succeed");
    }

    expect(single.requestedUrls).toEqual([
      "https://www.margonem.pl/profile/view,7298898",
    ]);

    const ownedItem = findItem(result.value, 1);

    expect(ownedItem?._tag).toBe("PreviewFailed");

    if (ownedItem?._tag === "PreviewFailed") {
      expect(ownedItem.error._tag).toBe("MargonemAccountAlreadyOwnedByActor");
    }
  });

  it("stores a pending import for each successful preview", async () => {
    const single = createFakeSinglePreview(new Map());
    const lookup = createFixedAccessLookup(new Map());
    const pending = createRecordingPendingStore();
    const service = new PreviewOwnedAccountImports(
      single,
      pending,
      lookup,
      fixedClock
    );

    const result = await service.preview({
      actorUserId: parseTestUserId(),
      profileUrls: [
        "https://www.margonem.pl/profile/view,7298897",
        "https://www.margonem.pl/profile/view,7298898",
      ],
    });

    expect(isOk(result)).toBe(true);

    if (!isOk(result)) {
      throw new Error("Expected batch to succeed");
    }

    expect(pending.createdImports).toHaveLength(2);
    expect(pending.createdImports[0]?.profileId).toEqual(
      parseTestProfileId(7_298_897)
    );

    const firstItem = findItem(result.value, 1);

    expect(firstItem?._tag).toBe("PreviewSucceeded");

    if (firstItem?._tag === "PreviewSucceeded") {
      expect(firstItem.suggestedAccountName).toBe("informati");
      expect(firstItem.jarunaCharacters).toHaveLength(1);
    }
  });

  it("marks remaining lines as budget exhausted after the first exhausted response", async () => {
    const exhaustedError = {
      _tag: "FirecrawlMonthlyBudgetExhausted",
      monthlyRequestBudget: 900,
      usedRequests: 900,
      yearMonth: {
        __brand: "FirecrawlYearMonth",
        value: "2026-06",
      } as never,
    } as const;
    const single = createFakeSinglePreview(
      new Map([
        [7_298_897, err(exhaustedError)],
        [7_298_898, err(exhaustedError)],
        [7_298_899, err(exhaustedError)],
      ])
    );
    const lookup = createFixedAccessLookup(new Map());
    const pending = createRecordingPendingStore();
    const service = new PreviewOwnedAccountImports(
      single,
      pending,
      lookup,
      fixedClock
    );

    const result = await service.preview({
      actorUserId: parseTestUserId(),
      profileUrls: [
        "https://www.margonem.pl/profile/view,7298897",
        "https://www.margonem.pl/profile/view,7298898",
        "https://www.margonem.pl/profile/view,7298899",
      ],
    });

    expect(isOk(result)).toBe(true);

    if (!isOk(result)) {
      throw new Error("Expected batch to succeed");
    }

    // Only the first two lines are dispatched (concurrency 2); the third is
    // short-circuited once the first exhausted response is observed.
    expect(single.requestedUrls).toEqual([
      "https://www.margonem.pl/profile/view,7298897",
      "https://www.margonem.pl/profile/view,7298898",
    ]);

    for (const lineNumber of [1, 2, 3]) {
      const item = findItem(result.value, lineNumber);

      if (item?._tag !== "PreviewFailed") {
        throw new Error(`Expected line ${lineNumber} to be a failure`);
      }

      expect(item.error._tag).toBe("FirecrawlMonthlyBudgetExhausted");
    }
  });

  it("returns per-line parse errors for invalid URLs without fetching", async () => {
    const single = createFakeSinglePreview(new Map());
    const lookup = createFixedAccessLookup(new Map());
    const service = new PreviewOwnedAccountImports(
      single,
      createRecordingPendingStore(),
      lookup,
      fixedClock
    );

    const result = await service.preview({
      actorUserId: parseTestUserId(),
      profileUrls: [
        "not-a-url",
        "https://www.margonem.pl/profile/view,7298897",
      ],
    });

    expect(isOk(result)).toBe(true);

    if (!isOk(result)) {
      throw new Error("Expected batch to succeed");
    }

    const invalidItem = findItem(result.value, 1);

    expect(invalidItem?._tag).toBe("PreviewFailed");

    if (invalidItem?._tag === "PreviewFailed") {
      expect(invalidItem.error._tag).toBe("InvalidMargonemProfileUrl");
    }

    expect(single.requestedUrls).toEqual([
      "https://www.margonem.pl/profile/view,7298897",
    ]);
  });
});
