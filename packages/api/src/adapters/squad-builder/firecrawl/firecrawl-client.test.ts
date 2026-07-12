import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import { describe, expect, it, vi } from "vitest";

import { parseMargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { FirecrawlSdkClient } from "./firecrawl-client.ts";

describe("FirecrawlSdkClient", () => {
  it("interrupts the waiting fiber without claiming SDK request cancellation", async () => {
    const pendingRequest = Promise.withResolvers<never>();
    const scrape = vi.fn(() => pendingRequest.promise);
    const client = new FirecrawlSdkClient("test", { scrape });
    const profileId = Effect.runSync(parseMargonemProfileId(123));

    const fiber = Effect.runFork(client.scrapeProfileHtml(profileId));
    await vi.waitFor(() => expect(scrape).toHaveBeenCalledOnce());
    await Effect.runPromise(Fiber.interrupt(fiber));

    expect(scrape).toHaveBeenCalledWith(
      "https://www.margonem.pl/profile/view,123",
      { formats: ["html"] }
    );
  });
});
