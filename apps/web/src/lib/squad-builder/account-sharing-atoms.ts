import { Atom } from "@effect-atom/atom-react";
import type {
  AccountAccessGrantsPayload,
  RespondToAccountAccessInvitePayload,
  RevokeAccountAccessPayload,
  SearchAccountInviteTargetsPayload,
  SendAccountAccessInvitePayload,
} from "@tepirek-revamped/api/modules/squad-builder/schema/account-sharing";
import type { ActorPayload } from "@tepirek-revamped/api/modules/squad-builder/schema/common";
import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";
import { refreshVisibleSquadGroupAtoms } from "@/lib/squad-builder/squad-group-atoms";

type AccountAccessGrantsInput = typeof AccountAccessGrantsPayload.Type;
type ActorInput = typeof ActorPayload.Type;
type RespondToAccountAccessInviteInput =
  typeof RespondToAccountAccessInvitePayload.Type;
type RevokeAccountAccessInput = typeof RevokeAccountAccessPayload.Type;
type SearchAccountInviteTargetsInput =
  typeof SearchAccountInviteTargetsPayload.Type;
type SendAccountAccessInviteInput = typeof SendAccountAccessInvitePayload.Type;

type AccountAccessGrantsKey = string;
type AccountInviteTargetsKey = string;

interface RefreshVisibleAccountSharingAtomsOptions {
  readonly accountId?: number;
  readonly actorUserId?: string;
}

const visibleIncomingAccountInviteActorIds = new Set<string>();
const visibleSharedAccountActorIds = new Set<string>();
const visibleAccountAccessGrantKeys = new Set<AccountAccessGrantsKey>();
const visibleAccountInviteTargetKeys = new Set<AccountInviteTargetsKey>();

const accountAccessGrantsKey = (
  payload: AccountAccessGrantsInput
): AccountAccessGrantsKey => `${payload.actorUserId}:${payload.accountId}`;

const accountAccessGrantsPayloadFromKey = (
  key: AccountAccessGrantsKey
): AccountAccessGrantsInput => {
  const [actorUserId = "", accountId = "0"] = key.split(":");
  return { accountId: Number(accountId), actorUserId };
};

const accountInviteTargetsKey = (
  payload: SearchAccountInviteTargetsInput
): AccountInviteTargetsKey =>
  JSON.stringify([payload.accountId, payload.actorUserId, payload.query]);

const accountInviteTargetsPayloadFromKey = (
  key: AccountInviteTargetsKey
): SearchAccountInviteTargetsInput => {
  const [accountId, actorUserId, query] = JSON.parse(key) as [
    number,
    string,
    string,
  ];
  return { accountId, actorUserId, query };
};

const accountAccessGrantsKeyMatches = (
  key: AccountAccessGrantsKey,
  options: RefreshVisibleAccountSharingAtomsOptions
): boolean => {
  const payload = accountAccessGrantsPayloadFromKey(key);
  return (
    (options.actorUserId === undefined ||
      payload.actorUserId === options.actorUserId) &&
    (options.accountId === undefined || payload.accountId === options.accountId)
  );
};

const accountInviteTargetsKeyMatches = (
  key: AccountInviteTargetsKey,
  options: RefreshVisibleAccountSharingAtomsOptions
): boolean => {
  const payload = accountInviteTargetsPayloadFromKey(key);
  return (
    (options.actorUserId === undefined ||
      payload.actorUserId === options.actorUserId) &&
    (options.accountId === undefined || payload.accountId === options.accountId)
  );
};

/** Resource atom for incoming squad-builder account invitations. */
const incomingAccountInvitesByActorAtom = Atom.family((actorUserId: string) =>
  appHttpApiAtom(
    Effect.gen(function* listIncomingAccountInvitesEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.listIncomingAccountInvites(
        {
          payload: { actorUserId },
        }
      );
    })
  )
);

export const incomingAccountInvitesAtom = (payload: ActorInput) => {
  visibleIncomingAccountInviteActorIds.add(payload.actorUserId);
  return incomingAccountInvitesByActorAtom(payload.actorUserId);
};

/** Resource atom for accounts shared with the current actor. */
const sharedAccountsByActorAtom = Atom.family((actorUserId: string) =>
  appHttpApiAtom(
    Effect.gen(function* listSharedAccountsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.listSharedAccounts({
        payload: { actorUserId },
      });
    })
  )
);

export const sharedAccountsAtom = (payload: ActorInput) => {
  visibleSharedAccountActorIds.add(payload.actorUserId);
  return sharedAccountsByActorAtom(payload.actorUserId);
};

/** Resource atom for access grants on one account. */
const accountAccessGrantsByKeyAtom = Atom.family(
  (key: AccountAccessGrantsKey) => {
    const payload = accountAccessGrantsPayloadFromKey(key);
    return appHttpApiAtom(
      Effect.gen(function* listAccountAccessGrantsEffect() {
        const client = yield* AppHttpApiClient;
        return yield* client.squadBuilderAccountSharing.listAccountAccessGrants(
          {
            payload,
          }
        );
      })
    );
  }
);

export const accountAccessGrantsAtom = (payload: AccountAccessGrantsInput) => {
  const key = accountAccessGrantsKey(payload);
  visibleAccountAccessGrantKeys.add(key);
  return accountAccessGrantsByKeyAtom(key);
};

/** Resource atom for account invite target search. */
const accountInviteTargetsByKeyAtom = Atom.family(
  (key: AccountInviteTargetsKey) => {
    const payload = accountInviteTargetsPayloadFromKey(key);
    return appHttpApiAtom(
      Effect.gen(function* searchAccountInviteTargetsEffect() {
        const client = yield* AppHttpApiClient;
        return yield* client.squadBuilderAccountSharing.searchAccountInviteTargets(
          {
            payload,
          }
        );
      })
    );
  }
);

export const accountInviteTargetsAtom = (
  payload: SearchAccountInviteTargetsInput
) => {
  const key = accountInviteTargetsKey(payload);
  visibleAccountInviteTargetKeys.add(key);
  return accountInviteTargetsByKeyAtom(key);
};

export const refreshVisibleAccountSharingAtoms = (
  get: Atom.FnContext,
  options: RefreshVisibleAccountSharingAtomsOptions = {}
) => {
  for (const actorUserId of visibleIncomingAccountInviteActorIds) {
    if (
      options.actorUserId === undefined ||
      actorUserId === options.actorUserId
    ) {
      get.refresh(incomingAccountInvitesByActorAtom(actorUserId));
    }
  }

  for (const actorUserId of visibleSharedAccountActorIds) {
    if (
      options.actorUserId === undefined ||
      actorUserId === options.actorUserId
    ) {
      get.refresh(sharedAccountsByActorAtom(actorUserId));
    }
  }

  for (const key of visibleAccountAccessGrantKeys) {
    if (accountAccessGrantsKeyMatches(key, options)) {
      get.refresh(accountAccessGrantsByKeyAtom(key));
    }
  }

  for (const key of visibleAccountInviteTargetKeys) {
    if (accountInviteTargetsKeyMatches(key, options)) {
      get.refresh(accountInviteTargetsByKeyAtom(key));
    }
  }
};

/** Mutation atom for sending an account access invite. */
export const sendAccountAccessInviteAtom = appHttpApiFn(
  (payload: SendAccountAccessInviteInput, get) =>
    Effect.gen(function* sendAccountAccessInviteEffect() {
      const client = yield* AppHttpApiClient;
      const invite =
        yield* client.squadBuilderAccountSharing.sendAccountAccessInvite({
          payload,
        });
      refreshVisibleAccountSharingAtoms(get, {
        accountId: payload.accountId,
        actorUserId: payload.actorUserId,
      });
      refreshVisibleAccountSharingAtoms(get, {
        actorUserId: payload.invitedUserId,
      });
      return invite;
    })
);

/** Mutation atom for responding to an account access invite. */
export const respondToAccountAccessInviteAtom = appHttpApiFn(
  (payload: RespondToAccountAccessInviteInput, get) =>
    Effect.gen(function* respondToAccountAccessInviteEffect() {
      const client = yield* AppHttpApiClient;
      const invite =
        yield* client.squadBuilderAccountSharing.respondToAccountAccessInvite({
          payload,
        });
      refreshVisibleAccountSharingAtoms(get, {
        actorUserId: payload.actorUserId,
      });
      refreshVisibleAccountSharingAtoms(get, {
        accountId: invite.accountId,
        actorUserId: invite.ownerUserId,
      });
      if (payload.response === "accept") {
        refreshVisibleSquadGroupAtoms(get, {
          actorUserId: payload.actorUserId,
        });
      }
      return invite;
    })
);

/** Mutation atom for revoking account access. */
export const revokeAccountAccessAtom = appHttpApiFn(
  (payload: RevokeAccountAccessInput, get) =>
    Effect.gen(function* revokeAccountAccessEffect() {
      const client = yield* AppHttpApiClient;
      const revoked =
        yield* client.squadBuilderAccountSharing.revokeAccountAccess({
          payload,
        });
      refreshVisibleAccountSharingAtoms(get, {
        accountId: revoked.accountId,
        actorUserId: payload.actorUserId,
      });
      refreshVisibleAccountSharingAtoms(get, {
        actorUserId: revoked.revokedUserId,
      });
      refreshVisibleSquadGroupAtoms(get, { actorUserId: payload.actorUserId });
      refreshVisibleSquadGroupAtoms(get, {
        actorUserId: revoked.revokedUserId,
      });
      return revoked;
    })
);
