import { readFileSync } from "node:fs";

import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { describe } from "vitest";

import {
  FirecrawlClientService,
  FirecrawlUrlRequestFailed,
} from "../../../services/squad-builder/firecrawl-client.ts";
import { FirecrawlConfigService } from "../../../services/squad-builder/firecrawl-config.ts";
import { FirecrawlRequestAccountingStoreService } from "../../../services/squad-builder/firecrawl-request-accounting-store.ts";
import {
  MargonemForumClientLiveLayer,
  MargonemForumClientService,
} from "./margonem-forum-client.ts";

const readFixture = (name: string): string =>
  readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf-8");

interface AccountingEvents {
  readonly failed: number[];
  readonly reserved: number[];
  readonly succeeded: number[];
}

const makeDependencies = (
  scrapeUrlHtml: (url: string) => Effect.Effect<
    {
      readonly html: string;
      readonly metadata: {
        readonly cacheState?: string | undefined;
        readonly contentType?: string | undefined;
        readonly creditsUsed?: number | undefined;
        readonly sourceURL?: string | undefined;
        readonly statusCode?: number | undefined;
        readonly url?: string | undefined;
      };
    },
    FirecrawlUrlRequestFailed
  >,
  events: AccountingEvents
) => {
  const accounting = FirecrawlRequestAccountingStoreService.of({
    markRequestFailed: ({ requestId }) =>
      Effect.sync(() => {
        events.failed.push(requestId);
      }),
    markRequestSucceeded: ({ requestId }) =>
      Effect.sync(() => {
        events.succeeded.push(requestId);
      }),
    reserveRequest: ({ monthlyRequestBudget, yearMonth }) =>
      Effect.sync(() => {
        const requestId = events.reserved.length + 1;
        events.reserved.push(requestId);
        return {
          budgetState: {
            monthlyRequestBudget,
            remainingRequests: monthlyRequestBudget - events.reserved.length,
            usedRequests: events.reserved.length,
            yearMonth,
          },
          requestId,
        };
      }),
  });

  return Layer.mergeAll(
    Layer.succeed(
      FirecrawlClientService,
      FirecrawlClientService.of({
        scrapeProfileHtml: () =>
          Effect.die(new Error("Profile scraping is not used by this test")),
        scrapeUrlHtml,
      })
    ),
    Layer.succeed(FirecrawlConfigService, {
      apiKey: Redacted.make("test-firecrawl-key"),
      monthlyRequestBudget: 900,
    }),
    Layer.succeed(FirecrawlRequestAccountingStoreService, accounting)
  );
};

const fetchTopic = (
  scrapeUrlHtml: Parameters<typeof makeDependencies>[0],
  category: "hero" | "elite2",
  events?: AccountingEvents
) => {
  const accountingEvents = events ?? {
    failed: [],
    reserved: [],
    succeeded: [],
  };

  return MargonemForumClientService.use((forum) =>
    forum.fetchTopic(category)
  ).pipe(
    Effect.provide(
      MargonemForumClientLiveLayer.pipe(
        Layer.provide(makeDependencies(scrapeUrlHtml, accountingEvents))
      )
    )
  );
};

const scrapedDocument = (
  html: string,
  metadata?: {
    readonly contentType?: string;
    readonly creditsUsed?: number;
    readonly statusCode?: number;
  }
) =>
  Effect.succeed({
    html,
    metadata: metadata ?? {
      contentType: "text/html; charset=UTF-8",
      creditsUsed: 1,
      statusCode: 200,
    },
  });

describe("Margonem forum client", () => {
  it.effect("fetches both fixed ps=0 topics through budgeted Firecrawl", () =>
    Effect.gen(function* fetchBothTopics() {
      const urls: string[] = [];
      const events: AccountingEvents = {
        failed: [],
        reserved: [],
        succeeded: [],
      };
      const scrape = (url: string) => {
        urls.push(url);
        return scrapedDocument(readFixture("valid-topic.html"));
      };

      yield* fetchTopic(scrape, "hero", events);
      yield* fetchTopic(scrape, "elite2", events);

      expect(urls).toEqual([
        "https://forum.margonem.pl/?task=forum&show=posts&id=514740&ps=0",
        "https://forum.margonem.pl/?task=forum&show=posts&id=514805&ps=0",
      ]);
      expect(events).toEqual({
        failed: [],
        reserved: [1, 2],
        succeeded: [1, 2],
      });
    })
  );

  it.effect("accepts a complete Firecrawl document larger than 2 MB", () =>
    Effect.gen(function* acceptLargeCompleteDocument() {
      const validHtml = readFixture("valid-topic.html");
      const largeValidHtml = validHtml.replace(
        "</body>",
        `${" ".repeat(2_000_000)}</body>`
      );

      const page = yield* fetchTopic(
        () => scrapedDocument(largeValidHtml),
        "hero"
      );

      expect(page.html).toBe(largeValidHtml);
    })
  );

  it.effect.each([
    ["block-page.html", "waiting or block page"],
    ["empty-page.html", "response is empty"],
    ["changed-format.html", "incomplete or unsupported HTML"],
  ] as const)("rejects unsafe fixture %s", ([fixture, expectedReason]) =>
    Effect.gen(function* rejectUnsafeFixture() {
      const error = yield* fetchTopic(
        () => scrapedDocument(readFixture(fixture)),
        "hero"
      ).pipe(Effect.flip);

      expect(error).toMatchObject({
        _tag: "MargonemForumDocumentRejected",
        category: "hero",
      });
      if (error._tag === "MargonemForumDocumentRejected") {
        expect(error.reason).toContain(expectedReason);
      }
    })
  );

  it.effect("rejects a non-HTML response before parsing", () =>
    Effect.gen(function* rejectContentType() {
      const error = yield* fetchTopic(
        () =>
          scrapedDocument(readFixture("valid-topic.html"), {
            contentType: "text/plain",
            creditsUsed: 1,
            statusCode: 200,
          }),
        "elite2"
      ).pipe(Effect.flip);

      expect(error).toMatchObject({
        _tag: "MargonemForumDocumentRejected",
        category: "elite2",
        reason: "response content type is not HTML",
      });
    })
  );

  it.effect("returns a typed request error for an origin failure status", () =>
    Effect.gen(function* rejectStatus() {
      const error = yield* fetchTopic(
        () =>
          scrapedDocument(readFixture("valid-topic.html"), {
            contentType: "text/html",
            creditsUsed: 1,
            statusCode: 502,
          }),
        "hero"
      ).pipe(Effect.flip);

      expect(error).toMatchObject({
        _tag: "MargonemForumRequestFailed",
        category: "hero",
        status: 502,
      });
    })
  );

  it.effect("records a failed Firecrawl request", () =>
    Effect.gen(function* recordFailure() {
      const events: AccountingEvents = {
        failed: [],
        reserved: [],
        succeeded: [],
      };
      const error = yield* fetchTopic(
        () =>
          Effect.fail(
            new FirecrawlUrlRequestFailed({
              cause: new Error("provider unavailable"),
            })
          ),
        "hero",
        events
      ).pipe(Effect.flip);

      expect(error._tag).toBe("MargonemForumRequestFailed");
      expect(events).toEqual({
        failed: [1],
        reserved: [1],
        succeeded: [],
      });
    })
  );
});
