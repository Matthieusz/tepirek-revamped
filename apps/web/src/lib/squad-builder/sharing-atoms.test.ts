import { describe, expect, it } from "vitest";

import {
  accountAccessGrantsAtom,
  accountInviteTargetsAtom,
  revokeAccountAccessAtom,
  sendAccountAccessInviteAtom,
} from "@/lib/squad-builder/account-sharing-atoms";
import {
  revokeSquadGroupEditorAtom,
  squadEditorInviteTargetsAtom,
  squadGroupEditorGrantsAtom,
} from "@/lib/squad-builder/squad-group-sharing-atoms";
import { flush, makeTestLayer } from "@/lib/test-utils/atom-test-utils";

describe("sharing atom families", () => {
  it("does not mount account-sharing resources for invalid account IDs", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.mount(accountAccessGrantsAtom(0, "actor"));
    registry.mount(accountInviteTargetsAtom(-1, "query"));
    await flush();

    expect(calls).toHaveLength(0);
  });

  it("refreshes the visible actor's account grants after sending an invite", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();
    const actorUserId = "actor";

    registry.mount(accountAccessGrantsAtom(5, actorUserId));
    await flush();
    const callsBefore = calls.filter(
      (call) => call.method === "listAccountAccessGrants"
    ).length;

    registry.set(sendAccountAccessInviteAtom, {
      accountId: 5,
      actorUserId,
      invitedUserId: "invited-user",
    });
    await flush();

    expect(
      calls.filter((call) => call.method === "listAccountAccessGrants")
    ).toHaveLength(callsBefore + 1);
  });

  it("refreshes the visible actor's account grants after revoking access", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();
    const actorUserId = "actor";

    registry.mount(accountAccessGrantsAtom(5, actorUserId));
    await flush();
    const callsBefore = calls.filter(
      (call) => call.method === "listAccountAccessGrants"
    ).length;

    registry.set(revokeAccountAccessAtom, {
      accessId: 12,
      accountId: 5,
      actorUserId,
    });
    await flush();

    expect(
      calls.filter((call) => call.method === "listAccountAccessGrants")
    ).toHaveLength(callsBefore + 1);
  });

  it("does not mount squad-sharing resources for invalid group IDs", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.mount(squadGroupEditorGrantsAtom({ groupId: 0 }));
    registry.mount(
      squadEditorInviteTargetsAtom({ groupId: -1, query: "query" })
    );
    await flush();

    expect(calls).toHaveLength(0);
  });

  it("refreshes editor grants for the revoked squad group", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.mount(squadGroupEditorGrantsAtom({ groupId: 7 }));
    await flush();
    const callsBefore = calls.filter(
      (call) => call.method === "listSquadGroupEditorGrants"
    ).length;

    registry.set(revokeSquadGroupEditorAtom, {
      groupId: 7,
      invitationId: 11,
    });
    await flush();

    expect(
      calls.filter((call) => call.method === "listSquadGroupEditorGrants")
    ).toHaveLength(callsBefore + 1);
  });
});
