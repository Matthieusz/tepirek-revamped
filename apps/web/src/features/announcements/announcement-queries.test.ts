import { MutationObserver, QueryObserver } from "@tanstack/react-query";
import { AnnouncementSummary } from "@tepirek-revamped/api/protocol/announcement/http-api-contract";
import * as Schema from "effect/Schema";
import { describe, expect, it, vi } from "vitest";

import type {
  Announcement,
  AnnouncementApiRunner,
} from "@/features/announcements/announcement-api";
import {
  announcementsQueryKey,
  announcementsQueryOptions,
  createAnnouncementMutationOptions,
  deleteAnnouncementMutationOptions,
} from "@/features/announcements/announcement-queries";
import { makeAppHttpApiRunner } from "@/lib/http-api-client-runtime";
import { makeHttpApiTestLayer } from "@/lib/test-utils/http-api-test-utils";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";

const makeAnnouncement = (
  id: number,
  title = `Announcement ${id}`
): Announcement =>
  Schema.decodeSync(AnnouncementSummary)({
    createdAt: "2026-01-01T00:00:00.000Z",
    description: `Description ${id}`,
    id,
    title,
    user: null,
  });

const failingRunner: AnnouncementApiRunner = async () =>
  await Promise.reject(new Error("Announcement request failed"));

interface Deferred<A> {
  readonly promise: Promise<A>;
  readonly resolve: (value: A) => void;
}

const deferred = <A>(): Deferred<A> => {
  let resolvePromise: (value: A) => void;

  // oxlint-disable-next-line promise/avoid-new -- tests need a manually controlled response
  const promise = new Promise<A>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value) => {
      resolvePromise(value);
    },
  };
};

describe("announcement queries and mutations", () => {
  it("loads announcements through the real HttpApiClient transport", async () => {
    const { calls, layer } = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(layer);
    const testClient = makeTestQueryClient();

    try {
      await expect(
        testClient.queryClient.query(announcementsQueryOptions(runner))
      ).resolves.toEqual([]);
      expect(calls).toEqual([
        {
          args: {},
          group: "announcement",
          method: "listAnnouncements",
        },
      ]);
    } finally {
      testClient.cleanup();
    }
  });

  it("keeps read failures as failures instead of empty data", async () => {
    const testClient = makeTestQueryClient();

    try {
      await expect(
        testClient.queryClient.query({
          ...announcementsQueryOptions(failingRunner),
          retry: false,
        })
      ).rejects.toThrow("Announcement request failed");
      expect(
        testClient.queryClient.getQueryData(announcementsQueryKey)
      ).toBeUndefined();
    } finally {
      testClient.cleanup();
    }
  });

  it("invalidates the list after a successful create", async () => {
    const { calls, layer } = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(layer);
    const testClient = makeTestQueryClient();

    const queryObserver = new QueryObserver(
      testClient.queryClient,
      announcementsQueryOptions(runner)
    );

    const unsubscribe = queryObserver.subscribe(() => {});

    try {
      await queryObserver.refetch();

      const create = new MutationObserver(
        testClient.queryClient,
        createAnnouncementMutationOptions(testClient.queryClient, runner)
      );

      await expect(
        create.mutate({ description: "Description", title: "Title" })
      ).resolves.toBeUndefined();

      expect(
        calls.filter((call) => call.method === "listAnnouncements")
      ).toHaveLength(2);
      expect(create.getCurrentResult().isSuccess).toBe(true);
      create.reset();
    } finally {
      unsubscribe();
      testClient.cleanup();
    }
  });

  it("keeps create successful when refreshing the list fails", async () => {
    const { layer } = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(layer);
    const testClient = makeTestQueryClient();
    const { queryClient } = testClient;
    const refreshErrors: Error[] = [];
    queryClient.setQueryData(announcementsQueryKey, []);

    const queryObserver = new QueryObserver(queryClient, {
      queryFn: async () =>
        await Promise.reject(new Error("Announcement list refresh failed")),
      queryKey: announcementsQueryKey,
      retry: false,
      staleTime: Number.POSITIVE_INFINITY,
    });

    const unsubscribe = queryObserver.subscribe(() => {});

    try {
      const create = new MutationObserver(
        queryClient,
        createAnnouncementMutationOptions(queryClient, runner, {
          onRefreshError: (error) => {
            refreshErrors.push(error);
          },
        })
      );

      await expect(
        create.mutate({ description: "Description", title: "Title" })
      ).resolves.toBeUndefined();

      expect(refreshErrors).toHaveLength(1);
      expect(create.getCurrentResult().isSuccess).toBe(true);
      expect(queryObserver.getCurrentResult().data).toEqual([]);
      create.reset();
    } finally {
      unsubscribe();
      testClient.cleanup();
    }
  });

  it("optimistically removes an announcement and restores it after failure", async () => {
    const firstAnnouncement = makeAnnouncement(1);
    const secondAnnouncement = makeAnnouncement(2);
    const failure = deferred<null>();
    const testClient = makeTestQueryClient();
    const { queryClient } = testClient;
    const errors: Error[] = [];
    queryClient.setQueryData(announcementsQueryKey, [
      firstAnnouncement,
      secondAnnouncement,
    ]);

    try {
      const deleteMutation = new MutationObserver(
        queryClient,
        deleteAnnouncementMutationOptions(
          queryClient,
          async () => {
            await failure.promise;
            throw new Error("Announcement request failed");
          },
          {
            onError: (error) => {
              errors.push(error);
            },
          }
        )
      );

      const request = deleteMutation.mutate({ id: firstAnnouncement.id });

      await vi.waitFor(() => {
        expect(queryClient.getQueryData(announcementsQueryKey)).toEqual([
          secondAnnouncement,
        ]);
      });
      failure.resolve(null);
      await expect(request).rejects.toThrow("Announcement request failed");
      expect(queryClient.getQueryData(announcementsQueryKey)).toEqual([
        firstAnnouncement,
        secondAnnouncement,
      ]);
      expect(errors).toHaveLength(1);
      deleteMutation.reset();
    } finally {
      testClient.cleanup();
    }
  });

  it("deletes an announcement without retrying and sends its branded ID", async () => {
    const { calls, layer } = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(layer);
    const testClient = makeTestQueryClient();
    const announcement = makeAnnouncement(7);
    testClient.queryClient.setQueryData(announcementsQueryKey, [announcement]);

    try {
      const deleteMutation = new MutationObserver(
        testClient.queryClient,
        deleteAnnouncementMutationOptions(testClient.queryClient, runner)
      );

      expect(
        deleteAnnouncementMutationOptions(testClient.queryClient, runner).retry
      ).toBe(false);
      await expect(
        deleteMutation.mutate({ id: announcement.id })
      ).resolves.toBeUndefined();

      expect(calls).toContainEqual({
        args: { id: 7 },
        group: "announcement",
        method: "deleteAnnouncement",
      });
      expect(
        testClient.queryClient.getQueryData(announcementsQueryKey)
      ).toEqual([]);
      deleteMutation.reset();
    } finally {
      testClient.cleanup();
    }
  });
});
