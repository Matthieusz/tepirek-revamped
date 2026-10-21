import { QueryObserver } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vite-plus/test";

import {
  availableSquadCharactersQueryOptions,
  squadGroupDetailQueryOptions,
} from "@/features/squad-builder/squad-group-queries";
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
