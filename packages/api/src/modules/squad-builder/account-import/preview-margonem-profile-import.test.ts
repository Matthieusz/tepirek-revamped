import { describe, expect, it } from "vitest";

import { parseAppUserId } from "../app-user-id";
import type { AppUserId } from "../app-user-id";
import type {
  FirecrawlClient,
  FirecrawlScrapeError,
  FirecrawlScrapeSuccess,
} from "../firecrawl-client";
import type { FirecrawlCreditCount } from "../firecrawl-config";
import type { FirecrawlYearMonth } from "../firecrawl-year-month";
import { parseMargonemProfileId } from "../margonem-profile-id";
import type { MargonemProfileId } from "../margonem-profile-id";
import { Redacted } from "../prelude";
import { err, isError, isOk, ok } from "../result";
import type { Result } from "../result";
import type {
  FirecrawlBudgetError,
  FirecrawlBudgetState,
  FirecrawlRequestLedger,
  MarkFirecrawlRequestFailedInput,
  MarkFirecrawlRequestSucceededInput,
  ProfileAccessState,
  ReserveFirecrawlRequestInput,
  ReservedFirecrawlRequest,
  SquadBuilderAccountLookup,
} from "./account-import-store";
import { PreviewMargonemProfileImport } from "./preview-margonem-profile-import";
import type { Clock } from "./preview-margonem-profile-import";

const parseTestUserId = (): AppUserId => {
  const userId = parseAppUserId("preview-user");

  if (!isOk(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
};

const parseTestProfileId = (): MargonemProfileId => {
  const profileId = parseMargonemProfileId(7_298_897);

  if (!isOk(profileId)) {
    throw new Error("Expected test profile id to be valid");
  }

  return profileId.value;
};

const createFixedAccessLookup = (
  state: ProfileAccessState
): SquadBuilderAccountLookup => ({
  findProfileAccessState: () => Promise.resolve(ok(state)),
});

type RecordingLedger = FirecrawlRequestLedger & {
  readonly reserveCalls: ReserveFirecrawlRequestInput[];
  readonly succeededCalls: MarkFirecrawlRequestSucceededInput[];
  readonly failedCalls: MarkFirecrawlRequestFailedInput[];
};

const createRecordingLedger = (
  reserveResult?: Result<ReservedFirecrawlRequest, FirecrawlBudgetError>
): RecordingLedger => {
  const reserveCalls: ReserveFirecrawlRequestInput[] = [];
  const succeededCalls: MarkFirecrawlRequestSucceededInput[] = [];
  const failedCalls: MarkFirecrawlRequestFailedInput[] = [];

  return {
    failedCalls,
    markRequestFailed: (input) => {
      failedCalls.push(input);
      return Promise.resolve(ok());
    },
    markRequestSucceeded: (input) => {
      succeededCalls.push(input);
      return Promise.resolve(ok());
    },
    reserveCalls,
    reserveRequest: (input) => {
      reserveCalls.push(input);

      if (reserveResult !== undefined) {
        return Promise.resolve(reserveResult);
      }

      const budgetState: FirecrawlBudgetState = {
        monthlyRequestBudget: 900,
        remainingRequests: 899,
        usedRequests: 1,
        yearMonth: input.yearMonth,
      };

      return Promise.resolve(ok({ budgetState, requestId: 123 }));
    },
    succeededCalls,
  };
};

type RecordingFirecrawlClient = FirecrawlClient & {
  readonly scrapedProfileIds: MargonemProfileId[];
};

const createRecordingFirecrawlClient = (
  result: Result<FirecrawlScrapeSuccess, FirecrawlScrapeError>
): RecordingFirecrawlClient => {
  const scrapedProfileIds: MargonemProfileId[] = [];

  return {
    scrapeProfileHtml: (profileId) => {
      scrapedProfileIds.push(profileId);
      return Promise.resolve(result);
    },
    scrapedProfileIds,
  };
};

const fixedClock: Clock = {
  now: () => new Date("2026-06-29T12:00:00.000Z"),
};

const htmlWithJarunaCharacter = `
  <div class="profile-header__name"><span>informati</span></div>
  <li data-nick="informati" data-lvl="315" data-world="#jaruna" class="char-row" data-id="1296625">
    <span class="cimg" style="background-image: url('https://example.com/avatar.gif');"></span>
    <span class="character-prof">Tropiciel,</span>
  </li>
`;

const successfulScrape = ok({
  html: htmlWithJarunaCharacter,
  metadata: {
    cacheState: "hit",
    creditsUsed: 1,
    statusCode: 200,
  },
});

describe("PreviewMargonemProfileImport", () => {
  it("rejects an already-owned profile before reserving budget or calling Firecrawl", async () => {
    const ledger = createRecordingLedger();
    const firecrawl = createRecordingFirecrawlClient(successfulScrape);
    const service = new PreviewMargonemProfileImport(
      createFixedAccessLookup({ _tag: "OwnedByActor" }),
      ledger,
      firecrawl,
      fixedClock,
      { apiKey: Redacted("test-key"), monthlyRequestBudget: 900 }
    );

    const result = await service.preview({
      actorUserId: parseTestUserId(),
      profileUrl: "https://www.margonem.pl/profile/view,7298897",
    });

    expect(isError(result)).toBe(true);
    expect(ledger.reserveCalls).toEqual([]);
    expect(firecrawl.scrapedProfileIds).toEqual([]);

    if (!isError(result)) {
      throw new Error("Expected preview to reject duplicate account");
    }

    expect(result.error._tag).toBe("MargonemAccountAlreadyOwnedByActor");
  });

  it("rejects before calling Firecrawl when the monthly budget is exhausted", async () => {
    const yearMonth = "2026-06" as FirecrawlYearMonth;
    const ledger = createRecordingLedger(
      err({
        _tag: "FirecrawlMonthlyBudgetExhausted",
        monthlyRequestBudget: 900,
        usedRequests: 900,
        yearMonth,
      })
    );
    const firecrawl = createRecordingFirecrawlClient(successfulScrape);
    const service = new PreviewMargonemProfileImport(
      createFixedAccessLookup({ _tag: "Available" }),
      ledger,
      firecrawl,
      fixedClock,
      { apiKey: Redacted("test-key"), monthlyRequestBudget: 900 }
    );

    const result = await service.preview({
      actorUserId: parseTestUserId(),
      profileUrl: "https://www.margonem.pl/profile/view,7298897",
    });

    expect(isError(result)).toBe(true);
    expect(ledger.reserveCalls).toHaveLength(1);
    expect(firecrawl.scrapedProfileIds).toEqual([]);
  });

  it("returns a Jaruna-only import preview for an available Margonem profile", async () => {
    const ledger = createRecordingLedger();
    const service = new PreviewMargonemProfileImport(
      createFixedAccessLookup({ _tag: "Available" }),
      ledger,
      createRecordingFirecrawlClient(successfulScrape),
      fixedClock,
      { apiKey: Redacted("test-key"), monthlyRequestBudget: 900 }
    );

    const result = await service.preview({
      actorUserId: parseTestUserId(),
      profileUrl:
        "https://www.margonem.pl/profile/view,7298897#char_1296625,jaruna",
    });

    expect(isOk(result)).toBe(true);

    if (!isOk(result)) {
      throw new Error("Expected preview to succeed");
    }

    expect(result.value).toMatchObject({
      firecrawlCreditsUsed: 1 as FirecrawlCreditCount,
      generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
      suggestedAccountName: "informati",
    });
    expect(result.value.jarunaCharacters).toEqual([
      expect.objectContaining({
        characterId: 1_296_625,
        level: 315,
        name: "informati",
        profession: "tracker",
      }),
    ]);
    expect(ledger.succeededCalls).toEqual([
      {
        cacheState: "hit",
        creditsUsed: 1,
        firecrawlStatusCode: 200,
        requestId: 123,
      },
    ]);
  });

  it("marks the reserved Firecrawl request failed when the scrape fails", async () => {
    const ledger = createRecordingLedger();
    const service = new PreviewMargonemProfileImport(
      createFixedAccessLookup({ _tag: "Available" }),
      ledger,
      createRecordingFirecrawlClient(
        err({
          _tag: "FirecrawlRequestFailed",
          cause: new Error("network failed"),
          profileId: parseTestProfileId(),
        })
      ),
      fixedClock,
      { apiKey: Redacted("test-key"), monthlyRequestBudget: 900 }
    );

    const result = await service.preview({
      actorUserId: parseTestUserId(),
      profileUrl: "https://www.margonem.pl/profile/view,7298897",
    });

    expect(isError(result)).toBe(true);
    expect(ledger.failedCalls).toEqual([
      { errorTag: "FirecrawlRequestFailed", requestId: 123 },
    ]);
  });
});
