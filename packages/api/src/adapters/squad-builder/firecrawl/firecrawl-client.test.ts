import { describe, expect, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import { TestClock } from "effect/testing";
import { vi } from "vitest";

import { parseMargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { FirecrawlSdkClient } from "./firecrawl-client.ts";

describe("FirecrawlSdkClient", () => {
  it.effect("returns a typed failure at the application deadline", () =>
    Effect.gen(function* enforceDeadline() {
      const pendingRequest = Promise.withResolvers<never>();
      const scrape = vi.fn(() => pendingRequest.promise);
      const client = new FirecrawlSdkClient("test", { scrape });
      const profileId = yield* parseMargonemProfileId(456);
      const fiber = yield* client
        .scrapeProfileHtml(profileId)
        .pipe(Effect.forkChild);

      yield* Effect.yieldNow;
      yield* TestClock.adjust(30_000);

      const exit = yield* Fiber.await(fiber);
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const reason = exit.cause.reasons.find(Cause.isFailReason);
        expect(reason?.error._tag).toBe("FirecrawlRequestFailed");
        expect(reason?.error.profileId).toBe(profileId);
      }
    })
  );

  it.effect(
    "interrupts the waiting fiber without claiming SDK request cancellation",
    () =>
      Effect.gen(function* interruptWaitingFiber() {
        const pendingRequest = Promise.withResolvers<never>();
        const scrape = vi.fn(() => pendingRequest.promise);
        const client = new FirecrawlSdkClient("test", { scrape });
        const profileId = yield* parseMargonemProfileId(123);

        const fiber = yield* client
          .scrapeProfileHtml(profileId)
          .pipe(Effect.forkChild);
        yield* Effect.yieldNow;
        yield* Fiber.interrupt(fiber);

        expect(scrape).toHaveBeenCalledWith(
          "https://www.margonem.pl/profile/view,123",
          { formats: ["html"] }
        );
      })
  );

  it.effect.each([
    ["wrong metadata type", { statusCode: "200" }],
    ["non-finite status code", { statusCode: Number.POSITIVE_INFINITY }],
    ["non-finite credit count", { creditsUsed: Number.NaN }],
  ])("rejects %s", (_name, metadata) =>
    Effect.gen(function* rejectMalformedMetadata() {
      const scrape = vi.fn(() =>
        Promise.resolve({
          html: "<html></html>",
          metadata,
        })
      );
      const client = new FirecrawlSdkClient("test", { scrape });
      const profileId = yield* parseMargonemProfileId(789);

      const exit = yield* Effect.exit(client.scrapeProfileHtml(profileId));

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const reason = exit.cause.reasons.find(Cause.isFailReason);
        expect(reason?.error._tag).toBe("FirecrawlResponseNotParseable");
        expect(reason?.error.profileId).toBe(profileId);
      }
    })
  );
});
