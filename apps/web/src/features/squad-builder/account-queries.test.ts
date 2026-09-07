import { MutationObserver, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  accountAccessGrantsQueryKey,
  accountAccessGrantsQueryOptions,
  accountInviteTargetsQueryKey,
  accountInviteTargetsQueryOptions,
  applyAccountRefetchMutationOptions,
  incomingAccountInvitesQueryKey,
  incomingAccountInvitesQueryOptions,
  ownedAccountsQueryKey,
  ownedAccountsQueryOptions,
  previewAccountRefetchMutationOptions,
  sharedAccountsQueryKey,
  sharedAccountsQueryOptions,
  sendAccountAccessInviteMutationOptions,
} from "@/features/squad-builder/account-queries";
import {
  availableSquadCharactersQueryKey,
  globalSquadGroupsQueryOptions,
  ownedSquadGroupsQueryOptions,
  squadGroupDetailQueryKey,
} from "@/features/squad-builder/squad-group-queries";
import { sharedSquadGroupsQueryKey } from "@/features/squad-builder/squad-group-sharing-queries";
import { makeAppHttpApiRunner } from "@/lib/http-api-client-runtime";
import { makeHttpApiTestLayer } from "@/lib/test-utils/http-api-test-utils";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";

describe("account queries", () => {
  it("keys actor-specific searches and skips incomplete resources", async () => {
    const { calls, layer } = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(layer);
    const testClient = makeTestQueryClient();

    try {
      await testClient.queryClient.query(
        accountInviteTargetsQueryOptions(7, "actor", "  al  ", runner)
      );
      await testClient.queryClient.query(
        accountInviteTargetsQueryOptions(7, "other-actor", "al", runner)
      );
      const invalidGrantsObserver = new QueryObserver(
        testClient.queryClient,
        accountAccessGrantsQueryOptions(0, "actor", runner)
      );
      const incompleteSearchObserver = new QueryObserver(
        testClient.queryClient,
        accountInviteTargetsQueryOptions(7, "actor", "a", runner)
      );
      const unsubscribeInvalidGrants = invalidGrantsObserver.subscribe(
        () => {}
      );
      const unsubscribeIncompleteSearch = incompleteSearchObserver.subscribe(
        () => {}
      );
      unsubscribeInvalidGrants();
      unsubscribeIncompleteSearch();

      expect(calls).toHaveLength(2);
      expect(
        testClient.queryClient.getQueryData(
          accountInviteTargetsQueryKey(7, "actor", "al")
        )
      ).toEqual([]);
      expect(
        testClient.queryClient.getQueryData(
          accountInviteTargetsQueryKey(7, "other-actor", "al")
        )
      ).toEqual([]);
    } finally {
      testClient.cleanup();
    }
  });

  it("loads owned, incoming, shared, grants, and search data through queries", async () => {
    const { calls, layer } = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(layer);
    const testClient = makeTestQueryClient();

    try {
      await Promise.all([
        testClient.queryClient.query(ownedAccountsQueryOptions(runner)),
        testClient.queryClient.query(
          incomingAccountInvitesQueryOptions(runner)
        ),
        testClient.queryClient.query(sharedAccountsQueryOptions(runner)),
        testClient.queryClient.query(
          accountAccessGrantsQueryOptions(7, "actor", runner)
        ),
        testClient.queryClient.query(
          accountInviteTargetsQueryOptions(7, "actor", "al", runner)
        ),
      ]);

      expect(calls).toHaveLength(5);
      expect(
        testClient.queryClient.getQueryData(ownedAccountsQueryKey)
      ).toEqual([]);
      expect(
        testClient.queryClient.getQueryData(incomingAccountInvitesQueryKey)
      ).toEqual([]);
      expect(
        testClient.queryClient.getQueryData(sharedAccountsQueryKey)
      ).toEqual([]);
      expect(
        testClient.queryClient.getQueryData(
          accountAccessGrantsQueryKey(7, "actor")
        )
      ).toEqual([]);
    } finally {
      testClient.cleanup();
    }
  });

  it("invalidates account and squad resources after sharing mutations", async () => {
    const { layer } = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(layer);
    const testClient = makeTestQueryClient();
    const { queryClient } = testClient;

    queryClient.setQueryData(ownedAccountsQueryKey, []);
    queryClient.setQueryData(incomingAccountInvitesQueryKey, []);
    queryClient.setQueryData(sharedAccountsQueryKey, []);
    queryClient.setQueryData(accountAccessGrantsQueryKey(1, "actor"), []);

    try {
      const send = new MutationObserver(
        queryClient,
        sendAccountAccessInviteMutationOptions(queryClient, runner)
      );
      await send.mutate({ accountId: 1, invitedUserId: "user" });

      for (const queryKey of [
        ownedAccountsQueryKey,
        incomingAccountInvitesQueryKey,
        sharedAccountsQueryKey,
        accountAccessGrantsQueryKey(1, "actor"),
      ]) {
        expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
      }
    } finally {
      testClient.cleanup();
    }
  });

  it("does not retry refetches and invalidates every affected account view", async () => {
    const { layer } = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(layer);
    const testClient = makeTestQueryClient();
    const { queryClient } = testClient;
    const ownedGroups = ownedSquadGroupsQueryOptions(runner);
    const globalGroups = globalSquadGroupsQueryOptions({}, runner);
    const affectedQueryKeys = [
      ownedAccountsQueryKey,
      sharedAccountsQueryKey,
      ownedGroups.queryKey,
      globalGroups.queryKey,
      sharedSquadGroupsQueryKey,
      squadGroupDetailQueryKey(1),
      availableSquadCharactersQueryKey(1),
    ];

    for (const queryKey of affectedQueryKeys) {
      queryClient.setQueryData(queryKey, []);
    }

    try {
      expect(previewAccountRefetchMutationOptions(runner).retry).toBe(false);
      expect(
        applyAccountRefetchMutationOptions(queryClient, runner).retry
      ).toBe(false);

      const apply = new MutationObserver(
        queryClient,
        applyAccountRefetchMutationOptions(queryClient, runner)
      );
      await apply.mutate({ refetchPreviewId: 7 });

      for (const queryKey of affectedQueryKeys) {
        expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
      }
    } finally {
      testClient.cleanup();
    }
  });

  it("does not deliver refetch callbacks after its observer is removed", async () => {
    const { layer } = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(layer);
    const testClient = makeTestQueryClient();
    const { queryClient } = testClient;
    let callbackCalled = false;
    queryClient.setQueryData(ownedAccountsQueryKey, []);

    try {
      const apply = new MutationObserver(
        queryClient,
        applyAccountRefetchMutationOptions(queryClient, runner)
      );
      const unsubscribe = apply.subscribe(() => {});
      const request = apply.mutate(
        { refetchPreviewId: 7 },
        {
          onSuccess: () => {
            callbackCalled = true;
          },
        }
      );
      unsubscribe();

      await request;

      expect(callbackCalled).toBe(false);
      expect(
        queryClient.getQueryState(ownedAccountsQueryKey)?.isInvalidated
      ).toBe(true);
    } finally {
      testClient.cleanup();
    }
  });
});
