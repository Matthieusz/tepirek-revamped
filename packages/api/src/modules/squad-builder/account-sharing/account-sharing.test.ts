import { describe, expect, it } from "vitest";

import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import { parseAppUserId } from "../app-user-id.js";
import type { AppUserId } from "../app-user-id.js";
import { parseMargonemAccountAccessId } from "../margonem-account-access-id.js";
import type { MargonemAccountAccessId } from "../margonem-account-access-id.js";
import { parseMargonemAccountId } from "../margonem-account-id.js";
import type { MargonemAccountId } from "../margonem-account-id.js";
import { err, isError, isOk, ok } from "../result.js";
import type { Result } from "../result.js";
import type {
  AccountAccessGrantSummary,
  AccountAccessInviteSummary,
  AccountInviteTarget,
  AccountSharingStore,
  OwnedAccountForSharing,
  RevokeAccountAccessResult,
  SharedMargonemAccountSummary,
  SquadBuilderPersistenceUnavailable,
} from "./account-sharing-store.js";
import { ListAccountSharingState } from "./list-account-sharing-state.js";
import { RespondToAccountAccessInvite } from "./respond-to-account-access-invite.js";
import { RevokeAccountAccess } from "./revoke-account-access.js";
import { SearchAccountInviteTargets } from "./search-account-invite-targets.js";
import { SendAccountAccessInvite } from "./send-account-access-invite.js";

const userId = (value: string): AppUserId => {
  const parsed = parseAppUserId(value);
  if (!isOk(parsed)) {
    throw new Error(`Invalid user id: ${value}`);
  }
  return parsed.value;
};

const accountId = (value: number): MargonemAccountId => {
  const parsed = parseMargonemAccountId(value);
  if (!isOk(parsed)) {
    throw new Error(`Invalid account id: ${value}`);
  }
  return parsed.value;
};

const accessId = (value: number): MargonemAccountAccessId => {
  const parsed = parseMargonemAccountAccessId(value);
  if (!isOk(parsed)) {
    throw new Error(`Invalid access id: ${value}`);
  }
  return parsed.value;
};

const fixedClock: Clock = {
  now: () => new Date("2026-06-29T12:00:00.000Z"),
};

const owner = userId("owner");
const otherUser = userId("other");
const invitee = userId("invitee");
const account = accountId(1);

const ownedAccount = (ownerId: AppUserId = owner): OwnedAccountForSharing => ({
  accountId: account,
  displayName: "informati" as never,
  ownerUserId: ownerId,
  profileId: 7_298_897 as never,
});

const inviteSummary = (
  overrides: Partial<AccountAccessInviteSummary> = {}
): AccountAccessInviteSummary => ({
  accessId: accessId(10),
  accountDisplayName: "informati" as never,
  accountId: account,
  createdAt: new Date("2026-06-29T11:00:00.000Z"),
  generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
  invitedUserId: invitee,
  ownerUserId: owner,
  ownerUserImage: null,
  ownerUserName: "owner",
  status: "pending",
  updatedAt: new Date("2026-06-29T11:00:00.000Z"),
  ...overrides,
});

interface FakeStore extends AccountSharingStore {
  readonly searchedWith: () => { query: string } | undefined;
  readonly upsertCalledWith: () =>
    | { invitedUserId: AppUserId; ownerUserId: AppUserId }
    | undefined;
  readonly respondCalledWith: () =>
    | { accessId: MargonemAccountAccessId; invitedUserId: AppUserId }
    | undefined;
  readonly revokeCalledWith: () =>
    | { accessId: MargonemAccountAccessId; ownerUserId: AppUserId }
    | undefined;
  readonly grantsListedFor: () => MargonemAccountId | undefined;
  setOwnedAccount: (account: OwnedAccountForSharing | undefined) => void;
  setUpsertResult: (
    result: Result<
      AccountAccessInviteSummary,
      | {
          readonly _tag: "AccountAccessTransitionNotAllowed";
          readonly currentStatus:
            | "pending"
            | "accepted"
            | "declined"
            | "revoked";
          readonly attempted: string;
        }
      | SquadBuilderPersistenceUnavailable
    >
  ) => void;
}

const createFakeStore = (
  overrides: {
    readonly owned?: OwnedAccountForSharing;
    readonly targets?: readonly AccountInviteTarget[];
    readonly verifiedTarget?:
      | { readonly _tag: "InviteTargetNotFound" }
      | { readonly _tag: "InviteTargetNotVerified" }
      | AccountInviteTarget;
    readonly upsert?: Result<
      AccountAccessInviteSummary,
      | {
          readonly _tag: "AccountAccessTransitionNotAllowed";
          readonly currentStatus:
            | "pending"
            | "accepted"
            | "declined"
            | "revoked";
          readonly attempted: string;
        }
      | SquadBuilderPersistenceUnavailable
    >;
    readonly respondResult?: Result<
      AccountAccessInviteSummary,
      | { readonly _tag: "AccountAccessInviteNotFound" }
      | { readonly _tag: "ActorIsNotInviteRecipient" }
      | {
          readonly _tag: "AccountAccessTransitionNotAllowed";
          readonly currentStatus:
            | "pending"
            | "accepted"
            | "declined"
            | "revoked";
          readonly attempted: string;
        }
      | SquadBuilderPersistenceUnavailable
    >;
    readonly revokeResult?: Result<
      RevokeAccountAccessResult,
      | { readonly _tag: "AccountAccessInviteNotFound" }
      | { readonly _tag: "ActorDoesNotOwnMargonemAccount" }
      | {
          readonly _tag: "AccountAccessTransitionNotAllowed";
          readonly currentStatus:
            | "pending"
            | "accepted"
            | "declined"
            | "revoked";
          readonly attempted: string;
        }
      | SquadBuilderPersistenceUnavailable
    >;
    readonly sharedAccounts?: readonly SharedMargonemAccountSummary[];
    readonly incomingInvites?: readonly AccountAccessInviteSummary[];
    readonly grants?: readonly AccountAccessGrantSummary[];
  } = {}
): FakeStore => {
  let owned: OwnedAccountForSharing | undefined =
    overrides.owned ?? ownedAccount();
  let upsertResult = overrides.upsert ?? ok(inviteSummary());
  let searched: { query: string } | undefined;
  let upsertArgs:
    | { invitedUserId: AppUserId; ownerUserId: AppUserId }
    | undefined;
  let respondArgs:
    | { accessId: MargonemAccountAccessId; invitedUserId: AppUserId }
    | undefined;
  let revokeArgs:
    | { accessId: MargonemAccountAccessId; ownerUserId: AppUserId }
    | undefined;
  let grantsAccount: MargonemAccountId | undefined;

  return {
    findOwnedAccountForSharing: () =>
      Promise.resolve(
        owned === undefined
          ? err({ _tag: "MargonemAccountNotFound" })
          : ok(owned)
      ),
    findVerifiedInviteTarget: () => {
      if (overrides.verifiedTarget === undefined) {
        return Promise.resolve(
          ok({
            image: null,
            name: "invitee",
            userId: invitee,
          })
        );
      }

      if ("_tag" in overrides.verifiedTarget) {
        return Promise.resolve(err(overrides.verifiedTarget));
      }

      return Promise.resolve(ok(overrides.verifiedTarget));
    },
    grantsListedFor: () => grantsAccount,
    listAccountAccessGrants: ({ accountId: id }) => {
      grantsAccount = id;
      return Promise.resolve(ok(overrides.grants ?? []));
    },
    listIncomingAccountInvites: () =>
      Promise.resolve(ok(overrides.incomingInvites ?? [])),
    listSharedAccounts: () =>
      Promise.resolve(ok(overrides.sharedAccounts ?? [])),
    respondCalledWith: () => respondArgs,
    respondToAccountAccessInvite: ({ accessId: id, invitedUserId: uid }) => {
      respondArgs = { accessId: id, invitedUserId: uid };
      return Promise.resolve(
        overrides.respondResult ?? ok(inviteSummary({ status: "accepted" }))
      );
    },
    revokeAccountAccess: ({ accessId: id, ownerUserId: oid }) => {
      revokeArgs = { accessId: id, ownerUserId: oid };
      return Promise.resolve(
        overrides.revokeResult ??
          ok({
            accessId: id,
            accountId: account,
            removedSquadCharacterCount: 0,
            revokedUserId: invitee,
          })
      );
    },
    revokeCalledWith: () => revokeArgs,
    searchInviteTargets: ({ query }) => {
      searched = { query };
      return Promise.resolve(ok(overrides.targets ?? []));
    },
    searchedWith: () => searched,
    setOwnedAccount: (next) => {
      owned = next;
    },
    setUpsertResult: (next) => {
      upsertResult = next;
    },
    upsertAccountAccessInvite: ({ invitedUserId: uid, ownerUserId: oid }) => {
      upsertArgs = { invitedUserId: uid, ownerUserId: oid };
      return Promise.resolve(upsertResult);
    },
    upsertCalledWith: () => upsertArgs,
  };
};

describe("SearchAccountInviteTargets", () => {
  it("rejects account invite target searches shorter than two characters", async () => {
    const store = createFakeStore();
    const service = new SearchAccountInviteTargets(store);

    const result = await service.search({
      accountId: account,
      actorUserId: owner,
      query: "a",
    });

    expect(isError(result)).toBe(true);

    if (!isError(result)) {
      throw new Error("Expected short query to fail");
    }

    expect(result.error._tag).toBe("InvalidAccountInviteTargetQuery");
    expect(store.searchedWith()).toBeUndefined();
  });

  it("does not search users when the actor does not own the account", async () => {
    const store = createFakeStore({
      owned: ownedAccount(otherUser),
    });
    const service = new SearchAccountInviteTargets(store);

    const result = await service.search({
      accountId: account,
      actorUserId: owner,
      query: "invitee",
    });

    expect(isError(result)).toBe(true);

    if (!isError(result)) {
      throw new Error("Expected non-owner search to fail");
    }

    expect(result.error._tag).toBe("ActorDoesNotOwnMargonemAccount");
    expect(store.searchedWith()).toBeUndefined();
  });

  it("returns search targets for the account owner", async () => {
    const targets: readonly AccountInviteTarget[] = [
      { image: null, name: "invitee", userId: invitee },
    ];
    const store = createFakeStore({ targets });
    const service = new SearchAccountInviteTargets(store);

    const result = await service.search({
      accountId: account,
      actorUserId: owner,
      query: "invitee",
    });

    expect(isOk(result)).toBe(true);

    if (!isOk(result)) {
      throw new Error("Expected search to succeed");
    }

    expect(result.value).toEqual(targets);
    expect(store.searchedWith()).toEqual({ query: "invitee" });
  });
});

describe("SendAccountAccessInvite", () => {
  it("rejects self-invites before writing an access row", async () => {
    const store = createFakeStore();
    const service = new SendAccountAccessInvite(store, fixedClock);

    const result = await service.send({
      accountId: account,
      actorUserId: owner,
      invitedUserId: owner,
    });

    expect(isError(result)).toBe(true);

    if (!isError(result)) {
      throw new Error("Expected self-invite to fail");
    }

    expect(result.error._tag).toBe("CannotInviteSelf");
    expect(store.upsertCalledWith()).toBeUndefined();
  });

  it("rejects sending when the actor does not own the account", async () => {
    const store = createFakeStore({ owned: ownedAccount(otherUser) });
    const service = new SendAccountAccessInvite(store, fixedClock);

    const result = await service.send({
      accountId: account,
      actorUserId: owner,
      invitedUserId: invitee,
    });

    expect(isError(result)).toBe(true);

    if (!isError(result)) {
      throw new Error("Expected non-owner send to fail");
    }

    expect(result.error._tag).toBe("ActorDoesNotOwnMargonemAccount");
    expect(store.upsertCalledWith()).toBeUndefined();
  });

  it("creates a pending account access invite for a verified target user", async () => {
    const store = createFakeStore();
    const service = new SendAccountAccessInvite(store, fixedClock);

    const result = await service.send({
      accountId: account,
      actorUserId: owner,
      invitedUserId: invitee,
    });

    expect(isOk(result)).toBe(true);

    if (!isOk(result)) {
      throw new Error("Expected send to succeed");
    }

    expect(result.value.status).toBe("pending");
    expect(store.upsertCalledWith()).toEqual({
      invitedUserId: invitee,
      ownerUserId: owner,
    });
  });

  it("allows the owner to re-send after decline or revoke by upserting to pending", async () => {
    const store = createFakeStore();
    store.setUpsertResult(ok(inviteSummary({ status: "pending" })));
    const service = new SendAccountAccessInvite(store, fixedClock);

    const result = await service.send({
      accountId: account,
      actorUserId: owner,
      invitedUserId: invitee,
    });

    expect(isOk(result)).toBe(true);

    if (!isOk(result)) {
      throw new Error("Expected re-send to succeed");
    }

    expect(result.value.status).toBe("pending");
  });

  it("propagates a transition conflict when the invite is already pending or accepted", async () => {
    const store = createFakeStore();
    store.setUpsertResult(
      err({
        _tag: "AccountAccessTransitionNotAllowed",
        attempted: "pending",
        currentStatus: "accepted",
      })
    );
    const service = new SendAccountAccessInvite(store, fixedClock);

    const result = await service.send({
      accountId: account,
      actorUserId: owner,
      invitedUserId: invitee,
    });

    expect(isError(result)).toBe(true);

    if (!isError(result)) {
      throw new Error("Expected conflict to propagate");
    }

    expect(result.error._tag).toBe("AccountAccessTransitionNotAllowed");
  });

  it("rejects inviting an unverified target", async () => {
    const store = createFakeStore({
      verifiedTarget: { _tag: "InviteTargetNotVerified" },
    });
    const service = new SendAccountAccessInvite(store, fixedClock);

    const result = await service.send({
      accountId: account,
      actorUserId: owner,
      invitedUserId: invitee,
    });

    expect(isError(result)).toBe(true);

    if (!isError(result)) {
      throw new Error("Expected unverified target to fail");
    }

    expect(result.error._tag).toBe("InviteTargetNotVerified");
    expect(store.upsertCalledWith()).toBeUndefined();
  });
});

describe("RespondToAccountAccessInvite", () => {
  it("lets the invited user accept a pending account access invite", async () => {
    const store = createFakeStore();
    const service = new RespondToAccountAccessInvite(store, fixedClock);

    const result = await service.respond({
      accessId: accessId(10),
      actorUserId: invitee,
      response: "accept",
    });

    expect(isOk(result)).toBe(true);

    if (!isOk(result)) {
      throw new Error("Expected accept to succeed");
    }

    expect(result.value.status).toBe("accepted");
    expect(store.respondCalledWith()).toEqual({
      accessId: accessId(10),
      invitedUserId: invitee,
    });
  });

  it("lets the invited user decline a pending account access invite", async () => {
    const store = createFakeStore({
      respondResult: ok(inviteSummary({ status: "declined" })),
    });
    const service = new RespondToAccountAccessInvite(store, fixedClock);

    const result = await service.respond({
      accessId: accessId(10),
      actorUserId: invitee,
      response: "decline",
    });

    expect(isOk(result)).toBe(true);

    if (!isOk(result)) {
      throw new Error("Expected decline to succeed");
    }

    expect(result.value.status).toBe("declined");
  });

  it("rejects accepting an invite as a different user via the store guard", async () => {
    const store = createFakeStore({
      respondResult: err({ _tag: "ActorIsNotInviteRecipient" }),
    });
    const service = new RespondToAccountAccessInvite(store, fixedClock);

    const result = await service.respond({
      accessId: accessId(10),
      actorUserId: otherUser,
      response: "accept",
    });

    expect(isError(result)).toBe(true);

    if (!isError(result)) {
      throw new Error("Expected non-recipient to fail");
    }

    expect(result.error._tag).toBe("ActorIsNotInviteRecipient");
  });
});

describe("RevokeAccountAccess", () => {
  it("revokes access and forwards the cleanup result from the store", async () => {
    const store = createFakeStore({
      revokeResult: ok({
        accessId: accessId(10),
        accountId: account,
        removedSquadCharacterCount: 3,
        revokedUserId: invitee,
      }),
    });
    const service = new RevokeAccountAccess(store, fixedClock);

    const result = await service.revoke({
      accessId: accessId(10),
      actorUserId: owner,
    });

    expect(isOk(result)).toBe(true);

    if (!isOk(result)) {
      throw new Error("Expected revoke to succeed");
    }

    expect(result.value.removedSquadCharacterCount).toBe(3);
    expect(store.revokeCalledWith()).toEqual({
      accessId: accessId(10),
      ownerUserId: owner,
    });
  });
});

describe("ListAccountSharingState", () => {
  it("lists only accepted shared accounts for the actor", async () => {
    const shared: readonly SharedMargonemAccountSummary[] = [
      {
        accountId: account,
        characterCount: 2,
        displayName: "informati" as never,
        generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
        lastFetchedAt: new Date("2026-06-29T11:00:00.000Z"),
        ownerUserId: owner,
        ownerUserImage: null,
        ownerUserName: "owner",
        profileId: 7_298_897 as never,
      },
    ];
    const store = createFakeStore({ sharedAccounts: shared });
    const service = new ListAccountSharingState(store);

    const result = await service.listSharedAccounts({ actorUserId: invitee });

    expect(isOk(result)).toBe(true);

    if (!isOk(result)) {
      throw new Error("Expected shared accounts list to succeed");
    }

    expect(result.value).toEqual(shared);
  });

  it("lists pending and accepted grants for an owned account", async () => {
    const grants: readonly AccountAccessGrantSummary[] = [
      {
        accessId: accessId(10),
        createdAt: new Date("2026-06-29T11:00:00.000Z"),
        invitedUserId: invitee,
        invitedUserImage: null,
        invitedUserName: "invitee",
        status: "pending",
        updatedAt: new Date("2026-06-29T11:00:00.000Z"),
      },
    ];
    const store = createFakeStore({ grants });
    const service = new ListAccountSharingState(store);

    const result = await service.listAccountAccessGrants({
      accountId: account,
      actorUserId: owner,
    });

    expect(isOk(result)).toBe(true);

    if (!isOk(result)) {
      throw new Error("Expected grants list to succeed");
    }

    expect(result.value).toEqual(grants);
    expect(store.grantsListedFor()).toBe(account);
  });

  it("rejects listing grants for an account owned by another user", async () => {
    const store = createFakeStore({ owned: ownedAccount(otherUser) });
    const service = new ListAccountSharingState(store);

    const result = await service.listAccountAccessGrants({
      accountId: account,
      actorUserId: owner,
    });

    expect(isError(result)).toBe(true);

    if (!isError(result)) {
      throw new Error("Expected non-owner grants list to fail");
    }

    expect(result.error._tag).toBe("ActorDoesNotOwnMargonemAccount");
    expect(store.grantsListedFor()).toBeUndefined();
  });
});
