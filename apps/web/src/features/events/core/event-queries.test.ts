import { MutationObserver } from "@tanstack/react-query";
import { EventSummary } from "@tepirek-revamped/api/protocol/event/http-api-contract";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import type { EventApiRunner } from "@/features/events/core/event-api";
import {
  eventsQueryKey,
  toggleEventActiveMutationOptions,
} from "@/features/events/core/event-queries";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";

const makeEvent = (id: number, active = true) =>
  Schema.decodeSync(EventSummary)({
    active,
    color: "#6366f1",
    endTime: "2026-01-01T00:00:00.000Z",
    icon: "calendar",
    id,
    name: `Event ${id}`,
  });

const failingRunner: EventApiRunner = async () => {
  await Promise.resolve();
  throw new Error("Event request failed");
};

describe("event queries", () => {
  it("rolls back an optimistic active-state change after failure", async () => {
    const testClient = makeTestQueryClient();
    const event = makeEvent(1);
    testClient.queryClient.setQueryData(eventsQueryKey, [event]);

    try {
      const mutation = new MutationObserver(
        testClient.queryClient,
        toggleEventActiveMutationOptions(testClient.queryClient, failingRunner)
      );

      await expect(
        mutation.mutate({ active: false, id: event.id })
      ).rejects.toThrow("Event request failed");
      expect(testClient.queryClient.getQueryData(eventsQueryKey)).toEqual([
        event,
      ]);
      expect(
        testClient.queryClient.getQueryState(eventsQueryKey)?.isInvalidated
      ).toBe(true);
      mutation.reset();
    } finally {
      testClient.cleanup();
    }
  });
});
