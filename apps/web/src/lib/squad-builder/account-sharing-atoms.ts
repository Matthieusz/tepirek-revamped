import { Atom } from "@effect-atom/atom-react";
import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";
import {
  asAppUserId,
  asMargonemAccountAccessId,
  asMargonemAccountId,
} from "@/lib/squad-builder/branded-ids";
import { refreshVisibleSquadGroupAtoms } from "@/lib/squad-builder/squad-group-atoms";

interface ActorInput {
  readonly actorUserId: string;
}
interface AccountAccessGrantsInput {
  readonly accountId: number;
  readonly actorUserId: string;
}
interface RespondToAccountAccessInviteInput {
  readonly accessId: number;
  readonly actorUserId: string;
  readonly response: "accept" | "decline";
}
interface RevokeAccountAccessInput {
  readonly accessId: number;
  readonly actorUserId: string;
}
interface SearchAccountInviteTargetsInput {
  readonly accountId: number;
  readonly actorUserId: string;
  readonly query: string;
}
interface SendAccountAccessInviteInput {
  readonly accountId: number;
  readonly actorUserId: string;
  readonly invitedUserId: string;
}

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
          payload: { actorUserId: asAppUserId(actorUserId) },
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
        payload: { actorUserId: asAppUserId(actorUserId) },
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
            payload: {
              accountId: asMargonemAccountId(payload.accountId),
              actorUserId: asAppUserId(payload.actorUserId),
            },
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
            payload: {
              accountId: asMargonemAccountId(payload.accountId),
              actorUserId: asAppUserId(payload.actorUserId),
              query: payload.query,
            },
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
          payload: {
            accountId: asMargonemAccountId(payload.accountId),
            actorUserId: asAppUserId(payload.actorUserId),
            invitedUserId: asAppUserId(payload.invitedUserId),
          },
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
          payload: {
            accessId: asMargonemAccountAccessId(payload.accessId),
            actorUserId: asAppUserId(payload.actorUserId),
            response: payload.response,
          },
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
          payload: {
            accessId: asMargonemAccountAccessId(payload.accessId),
            actorUserId: asAppUserId(payload.actorUserId),
          },
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
