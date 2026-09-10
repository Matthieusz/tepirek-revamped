import { MutationObserver, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  availableSquadCharactersQueryKey,
  squadGroupDetailQueryKey,
} from "@/features/squad-builder/squad-group-queries";
import {
  incomingSquadGroupInvitesQueryKey,
  incomingSquadGroupInvitesQueryOptions,
  respondToSquadGroupInviteMutationOptions,
  revokeSquadGroupEditorMutationOptions,
  sharedSquadGroupsQueryKey,
  sharedSquadGroupsQueryOptions,
  sendSquadGroupEditorInviteMutationOptions,
  squadEditorInviteTargetsQueryKey,
  squadEditorInviteTargetsQueryOptions,
  squadGroupEditorGrantsQueryKey,
  squadGroupEditorGrantsQueryOptions,
} from "@/features/squad-builder/squad-group-sharing-queries";
import { makeAppHttpApiRunner } from "@/lib/http-api-client-runtime";
import { makeHttpApiTestLayer } from "@/lib/test-utils/http-api-test-utils";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";

describe("squad group sharing queries", () => {
  it("keys search text and skips invalid or incomplete resources", async () => {
    const { calls, layer } = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(layer);
    const testClient = makeTestQueryClient();

    try {
      const invalidGrantsObserver = new QueryObserver(
        testClient.queryClient,
        squadGroupEditorGrantsQueryOptions(0, runner)
      );

      const incompleteSearchObserver = new QueryObserver(
        testClient.queryClient,
        squadEditorInviteTargetsQueryOptions(7, "a", runner)
      );

      const invalidGrantsUnsubscribe = invalidGrantsObserver.subscribe(
        () => {}
      );

      const incompleteSearchUnsubscribe = incompleteSearchObserver.subscribe(
        () => {}
      );

      await testClient.queryClient.query(
        squadEditorInviteTargetsQueryOptions(7, "  al  ", runner)
      );
      invalidGrantsUnsubscribe();
      incompleteSearchUnsubscribe();

      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({
        group: "squadBuilderSquadGroupSharing",
        method: "searchSquadEditorInviteTargets",
      });
      expect(
        testClient.queryClient.getQueryData(
          squadEditorInviteTargetsQueryKey(7, "al")
        )
      ).toEqual([]);
    } finally {
      testClient.cleanup();
    }
  });

  it("loads shared resources through keyed queries", async () => {
    const { calls, layer } = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(layer);
    const testClient = makeTestQueryClient();

    try {
      await Promise.all([
        testClient.queryClient.query(
          incomingSquadGroupInvitesQueryOptions(runner)
        ),
        testClient.queryClient.query(sharedSquadGroupsQueryOptions(runner)),
        testClient.queryClient.query(
          squadGroupEditorGrantsQueryOptions(7, runner)
        ),
      ]);

      expect(calls).toHaveLength(3);
      expect(
        testClient.queryClient.getQueryData(incomingSquadGroupInvitesQueryKey)
      ).toEqual([]);
      expect(
        testClient.queryClient.getQueryData(sharedSquadGroupsQueryKey)
      ).toEqual([]);
      expect(
        testClient.queryClient.getQueryData(squadGroupEditorGrantsQueryKey(7))
      ).toEqual([]);
    } finally {
      testClient.cleanup();
    }
  });

  it("invalidates sharing and affected group resources after mutations", async () => {
    const { layer } = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(layer);
    const testClient = makeTestQueryClient();
    const { queryClient } = testClient;

    queryClient.setQueryData(incomingSquadGroupInvitesQueryKey, []);
    queryClient.setQueryData(sharedSquadGroupsQueryKey, []);
    queryClient.setQueryData(squadGroupEditorGrantsQueryKey(1), []);
    queryClient.setQueryData(squadEditorInviteTargetsQueryKey(1, "al"), []);
    queryClient.setQueryData(squadGroupDetailQueryKey(1), {});
    queryClient.setQueryData(availableSquadCharactersQueryKey(1), []);

    try {
      const send = new MutationObserver(
        queryClient,
        sendSquadGroupEditorInviteMutationOptions(queryClient, runner)
      );

      await send.mutate({ groupId: 1, invitedUserId: "user" });
      send.reset();

      const respond = new MutationObserver(
        queryClient,
        respondToSquadGroupInviteMutationOptions(queryClient, runner)
      );

      await respond.mutate({ invitationId: 1, response: "accept" });
      await respond.mutate({ invitationId: 1, response: "decline" });
      respond.reset();

      const revoke = new MutationObserver(
        queryClient,
        revokeSquadGroupEditorMutationOptions(queryClient, runner)
      );

      await revoke.mutate({ invitationId: 1 });
      revoke.reset();

      for (const queryKey of [
        incomingSquadGroupInvitesQueryKey,
        sharedSquadGroupsQueryKey,
        squadGroupEditorGrantsQueryKey(1),
        squadEditorInviteTargetsQueryKey(1, "al"),
        squadGroupDetailQueryKey(1),
        availableSquadCharactersQueryKey(1),
      ]) {
        expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
      }
    } finally {
      testClient.cleanup();
    }
  });
});
