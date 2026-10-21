import { QueryObserver } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vite-plus/test";

import {
  availableSquadCharactersQueryKey,
  availableSquadCharactersQueryOptions,
  globalSquadGroupsQueryOptions,
  invalidateSquadGroupResources,
  ownedSquadGroupsQueryOptions,
  squadGroupDetailQueryKey,
  squadGroupDetailQueryOptions,
  squadGroupsQueryKey,
} from "@/features/squad-builder/squad-group-queries";
import { sharedSquadGroupsQueryKey } from "@/features/squad-builder/squad-group-sharing-queries";
import { makeTestAppEffectQuery } from "@/lib/test-utils/effect-query-test-utils";
import { makeHttpApiTestLayer } from "@/lib/test-utils/http-api-test-utils";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";

describe("squad group resource queries", () => {
  it.each([0, -1])(
    "does not request resources for group %s",
    async (groupId) => {
      const { calls, layer } = makeHttpApiTestLayer();
      const effectQuery = makeTestAppEffectQuery(layer);
      const { queryClient, cleanup } = makeTestQueryClient();

      const detailObserver = new QueryObserver(queryClient, {
        ...squadGroupDetailQueryOptions(groupId, effectQuery),
        retry: false,
      });

      const charactersObserver = new QueryObserver(queryClient, {
        ...availableSquadCharactersQueryOptions(groupId, effectQuery),
        retry: false,
      });

      const unsubscribeDetail = detailObserver.subscribe(() => {});

      const unsubscribeCharacters = charactersObserver.subscribe(() => {});

      try {
        expect(detailObserver.getCurrentResult().fetchStatus).toBe("idle");
        expect(charactersObserver.getCurrentResult().fetchStatus).toBe("idle");
        expect(calls).toEqual([]);

        // The same subscribed observers must issue requests once the ID is valid.
        detailObserver.setOptions({
          ...squadGroupDetailQueryOptions(7, effectQuery),
          retry: false,
        });
        charactersObserver.setOptions({
          ...availableSquadCharactersQueryOptions(7, effectQuery),
          retry: false,
        });

        await vi.waitFor(() => {
          expect(calls).toHaveLength(2);
        });
        expect(calls).toEqual(
          expect.arrayContaining([
            {
              args: { groupId: 7 },
              group: "squadBuilderSquadGroup",
              method: "getSquadGroupDetail",
            },
            {
              args: { groupId: 7 },
              group: "squadBuilderSquadGroup",
              method: "listAvailableSquadCharacters",
            },
          ])
        );
      } finally {
        unsubscribeDetail();
        unsubscribeCharacters();
        cleanup();
      }
    }
  );
});

describe("squad group resource invalidation", () => {
  it.each([false, true])(
    "invalidates only lists and the changed group (active: %s)",
    async (active) => {
      const testClient = makeTestQueryClient();
      const { queryClient } = testClient;

      const affectedKeys = [
        ownedSquadGroupsQueryOptions().queryKey,
        globalSquadGroupsQueryOptions().queryKey,
        globalSquadGroupsQueryOptions({ nameQuery: "raid" }).queryKey,
        globalSquadGroupsQueryOptions({ maxLevel: 200, minLevel: 100 })
          .queryKey,
        squadGroupDetailQueryKey(1),
        availableSquadCharactersQueryKey(1),
      ];

      const unaffectedKeys = [
        squadGroupDetailQueryKey(2),
        availableSquadCharactersQueryKey(2),
        squadGroupsQueryKey,
        sharedSquadGroupsQueryKey,
        ["unrelated"],
      ];

      const resources = [
        ...affectedKeys.map((queryKey) => ({ affected: true, queryKey })),
        ...unaffectedKeys.map((queryKey) => ({ affected: false, queryKey })),
      ].map((resource) => ({ ...resource, fetches: 0 }));

      const unsubscribeAll: (() => void)[] = [];

      try {
        for (const resource of resources) {
          queryClient.setQueryData(resource.queryKey, []);

          if (active) {
            const observer = new QueryObserver(queryClient, {
              queryFn: async () => {
                resource.fetches += 1;

                return await Promise.resolve([]);
              },
              queryKey: resource.queryKey,
              staleTime: Number.POSITIVE_INFINITY,
            });

            unsubscribeAll.push(observer.subscribe(() => {}));
          }
        }

        await invalidateSquadGroupResources(queryClient, 1);

        for (const resource of resources) {
          expect(resource.fetches, JSON.stringify(resource.queryKey)).toBe(
            active && resource.affected ? 1 : 0
          );
          expect(
            queryClient.getQueryState(resource.queryKey)?.isInvalidated,
            JSON.stringify(resource.queryKey)
          ).toBe(!active && resource.affected);
        }
      } finally {
        for (const unsubscribe of unsubscribeAll) {
          unsubscribe();
        }

        testClient.cleanup();
      }
    }
  );
});
