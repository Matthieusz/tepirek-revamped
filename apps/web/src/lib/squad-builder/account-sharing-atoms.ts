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

interface RespondToAccountAccessInviteInput {
  readonly accessId: number;
  readonly response: "accept" | "decline";
}
interface RevokeAccountAccessInput {
  readonly accessId: number;
}
interface SearchAccountInviteTargetsInput {
  readonly accountId: number;
  readonly query: string;
}
interface SendAccountAccessInviteInput {
  readonly accountId: number;
  readonly invitedUserId: string;
}

type AccountAccessGrantsKey = string;
type AccountInviteTargetsKey = string;

interface RefreshVisibleAccountSharingAtomsOptions {
  readonly accountId?: number;
  readonly actorUserId?: string;
}

const visibleIncomingAccountInviteActorIds = new Set<string>(["default"]);
const visibleSharedAccountActorIds = new Set<string>(["default"]);
const visibleAccountAccessGrantKeys = new Set<AccountAccessGrantsKey>();
const visibleAccountInviteTargetKeys = new Set<AccountInviteTargetsKey>();

const accountAccessGrantsKey = (
  accountId: number,
  actorUserId: string
): AccountAccessGrantsKey => `${accountId}:${actorUserId}`;

const incomingAccountInvitesByActorAtom = Atom.family((_actorUserId: string) =>
  appHttpApiAtom(
    Effect.gen(function* incomingAccountInvitesEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.listIncomingAccountInvites(
        {
          payload: {},
        }
      );
    })
  )
);

const sharedAccountsByActorAtom = Atom.family((_actorUserId: string) =>
  appHttpApiAtom(
    Effect.gen(function* sharedAccountsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.listSharedAccounts({
        payload: {},
      });
    })
  )
);

const accountAccessGrantsByKeyAtom = Atom.family(
  (key: AccountAccessGrantsKey) =>
    appHttpApiAtom(
      Effect.gen(function* accountAccessGrantsEffect() {
        const client = yield* AppHttpApiClient;
        const [accountId] = key.split(":");
        return yield* client.squadBuilderAccountSharing.listAccountAccessGrants(
          {
            payload: { accountId: asMargonemAccountId(Number(accountId)) },
          }
        );
      })
    )
);

const accountInviteTargetsByKeyAtom = Atom.family(
  (_key: AccountInviteTargetsKey) =>
    appHttpApiAtom(
      Effect.gen(function* accountInviteTargetsEffect() {
        const client = yield* AppHttpApiClient;
        const [accountId, query] = _key.split(":");
        return yield* client.squadBuilderAccountSharing.searchAccountInviteTargets(
          {
            payload: {
              accountId: asMargonemAccountId(Number(accountId)),
              query: decodeURIComponent(query),
            },
          }
        );
      })
    )
);

export const incomingAccountInvitesAtom =
  incomingAccountInvitesByActorAtom("default");

export const sharedAccountsAtom = sharedAccountsByActorAtom("default");

export const accountAccessGrantsAtom = (
  accountId: number,
  actorUserId: string
) => {
  const key = accountAccessGrantsKey(accountId, actorUserId);
  visibleAccountAccessGrantKeys.add(key);
  return accountAccessGrantsByKeyAtom(key);
};

export const accountInviteTargetsAtom = (accountId: number, query: string) => {
  const key = `${accountId}:${encodeURIComponent(query)}`;
  visibleAccountInviteTargetKeys.add(key);
  return accountInviteTargetsByKeyAtom(key);
};

export const refreshVisibleAccountSharingAtoms = (
  get: Atom.FnContext,
  options?: RefreshVisibleAccountSharingAtomsOptions
) => {
  const { accountId, actorUserId } = options ?? {};

  for (const visibleActorUserId of visibleIncomingAccountInviteActorIds) {
    if (actorUserId === undefined || visibleActorUserId === actorUserId) {
      get.refresh(incomingAccountInvitesByActorAtom(visibleActorUserId));
    }
  }

  for (const visibleActorUserId of visibleSharedAccountActorIds) {
    if (actorUserId === undefined || visibleActorUserId === actorUserId) {
      get.refresh(sharedAccountsByActorAtom(visibleActorUserId));
    }
  }

  for (const visibleKey of visibleAccountAccessGrantKeys) {
    if (accountId === undefined || visibleKey.startsWith(`${accountId}:`)) {
      get.refresh(accountAccessGrantsByKeyAtom(visibleKey));
    }
  }

  refreshVisibleSquadGroupAtoms(get, { actorUserId });
};

/** Mutation atom for searching account invite targets. */
export const searchAccountInviteTargetsAtom = appHttpApiFn(
  (payload: SearchAccountInviteTargetsInput) =>
    Effect.gen(function* searchAccountInviteTargetsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.searchAccountInviteTargets(
        {
          payload: {
            accountId: asMargonemAccountId(payload.accountId),
            query: payload.query,
          },
        }
      );
    })
);

/** Mutation atom for sending account access invite. */
export const sendAccountAccessInviteAtom = appHttpApiFn(
  (payload: SendAccountAccessInviteInput, get) =>
    Effect.gen(function* sendAccountAccessInviteEffect() {
      const client = yield* AppHttpApiClient;
      const result =
        yield* client.squadBuilderAccountSharing.sendAccountAccessInvite({
          payload: {
            accountId: asMargonemAccountId(payload.accountId),
            invitedUserId: asAppUserId(payload.invitedUserId),
          },
        });
      refreshVisibleAccountSharingAtoms(get, { accountId: payload.accountId });
      return result;
    })
);

/** Mutation atom for responding to account access invite. */
export const respondToAccountAccessInviteAtom = appHttpApiFn(
  (payload: RespondToAccountAccessInviteInput, get) =>
    Effect.gen(function* respondToAccountAccessInviteEffect() {
      const client = yield* AppHttpApiClient;
      const result =
        yield* client.squadBuilderAccountSharing.respondToAccountAccessInvite({
          payload: {
            accessId: asMargonemAccountAccessId(payload.accessId),
            response: payload.response,
          },
        });
      refreshVisibleAccountSharingAtoms(get);
      return result;
    })
);

/** Mutation atom for revoking account access. */
export const revokeAccountAccessAtom = appHttpApiFn(
  (payload: RevokeAccountAccessInput, get) =>
    Effect.gen(function* revokeAccountAccessEffect() {
      const client = yield* AppHttpApiClient;
      const result =
        yield* client.squadBuilderAccountSharing.revokeAccountAccess({
          payload: {
            accessId: asMargonemAccountAccessId(payload.accessId),
          },
        });
      refreshVisibleAccountSharingAtoms(get);
      return result;
    })
);
