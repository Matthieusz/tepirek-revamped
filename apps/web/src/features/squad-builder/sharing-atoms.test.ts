import { describe, expect, it } from "vitest";

import {
  accountAccessGrantsAtom,
  accountInviteTargetsAtom,
  revokeAccountAccessAtom,
  sendAccountAccessInviteAtom,
} from "@/features/squad-builder/account-sharing-atoms";
import {
  revokeSquadGroupEditorAtom,
  squadEditorInviteTargetsAtom,
  squadGroupEditorGrantsAtom,
} from "@/features/squad-builder/squad-group-sharing-atoms";
import {
  makeTestLayer,
  waitForAtomResults,
} from "@/lib/test-utils/atom-test-utils";

describe("sharing atom families", () => {
  it("does not mount account-sharing resources for invalid account IDs", () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.mount(accountAccessGrantsAtom(0, "actor"));
    registry.mount(accountInviteTargetsAtom(-1, "query"));
    expect(calls).toHaveLength(0);
  });

  it("refreshes the visible actor's account grants after sending an invite", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();
    const actorUserId = "actor";

    const grants = accountAccessGrantsAtom(5, actorUserId);
    registry.mount(grants);
    await waitForAtomResults(registry, [grants]);
    const callsBefore = calls.filter(
      (call) => call.method === "listAccountAccessGrants"
    ).length;

    registry.set(sendAccountAccessInviteAtom, {
      accountId: 5,
      actorUserId,
      invitedUserId: "invited-user",
    });
    await waitForAtomResults(registry, [sendAccountAccessInviteAtom]);

    expect(
      calls.filter((call) => call.method === "listAccountAccessGrants")
    ).toHaveLength(callsBefore + 1);
  });

  it("refreshes the visible actor's account grants after revoking access", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();
    const actorUserId = "actor";

    const grants = accountAccessGrantsAtom(5, actorUserId);
    registry.mount(grants);
    await waitForAtomResults(registry, [grants]);
    const callsBefore = calls.filter(
      (call) => call.method === "listAccountAccessGrants"
    ).length;

    registry.set(revokeAccountAccessAtom, {
      accessId: 12,
      accountId: 5,
      actorUserId,
    });
    await waitForAtomResults(registry, [revokeAccountAccessAtom]);

    expect(
      calls.filter((call) => call.method === "listAccountAccessGrants")
    ).toHaveLength(callsBefore + 1);
  });

  it("does not mount squad-sharing resources for invalid group IDs", () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.mount(squadGroupEditorGrantsAtom({ groupId: 0 }));
    registry.mount(
      squadEditorInviteTargetsAtom({ groupId: -1, query: "query" })
    );
    expect(calls).toHaveLength(0);
  });

  it("refreshes editor grants for the revoked squad group", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    const grants = squadGroupEditorGrantsAtom({ groupId: 7 });
    registry.mount(grants);
    await waitForAtomResults(registry, [grants]);
    const callsBefore = calls.filter(
      (call) => call.method === "listSquadGroupEditorGrants"
    ).length;

    registry.set(revokeSquadGroupEditorAtom, {
      groupId: 7,
      invitationId: 11,
    });
    await waitForAtomResults(registry, [revokeSquadGroupEditorAtom]);

    expect(
      calls.filter((call) => call.method === "listSquadGroupEditorGrants")
    ).toHaveLength(callsBefore + 1);
  });
});
