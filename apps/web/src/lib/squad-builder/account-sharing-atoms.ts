import type {
  AccountAccessGrantSummarySchema,
  AccountInviteTargetSchema,
} from "@tepirek-revamped/api/protocol/squad-builder/account-sharing/account-sharing-schema";
import { Effect } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";

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
  readonly accountId: number;
  readonly actorUserId: string;
}
interface SearchAccountInviteTargetsInput {
  readonly accountId: number;
  readonly query: string;
}
interface SendAccountAccessInviteInput {
  readonly accountId: number;
  readonly actorUserId: string;
  readonly invitedUserId: string;
}

type AccountAccessGrantsKey = string;
type AccountInviteTargetsKey = string;

type AccountAccessGrant = typeof AccountAccessGrantSummarySchema.Type;
type AccountInviteTarget = typeof AccountInviteTargetSchema.Type;

const disabledAccountAccessGrantsAtom = Atom.make<
  AsyncResult.AsyncResult<readonly AccountAccessGrant[], never>
>(AsyncResult.success([]));
const disabledAccountInviteTargetsAtom = Atom.make<
  AsyncResult.AsyncResult<readonly AccountInviteTarget[], never>
>(AsyncResult.success([]));

const accountAccessGrantsKey = (
  accountId: number,
  actorUserId: string
): AccountAccessGrantsKey => `${accountId}:${actorUserId}`;

const accountInviteTargetsKey = (
  accountId: number,
  query: string
): AccountInviteTargetsKey => `${accountId}:${encodeURIComponent(query)}`;

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
    ).pipe(Atom.setIdleTTL("5 minutes"))
);

const accountInviteTargetsByKeyAtom = Atom.family(
  (_key: AccountInviteTargetsKey) =>
    appHttpApiAtom(
      Effect.gen(function* accountInviteTargetsEffect() {
        const client = yield* AppHttpApiClient;
        const [accountId, query] = _key.split(":");
        if (query === undefined) {
          return [];
        }
        return yield* client.squadBuilderAccountSharing.searchAccountInviteTargets(
          {
            payload: {
              accountId: asMargonemAccountId(Number(accountId)),
              query: decodeURIComponent(query),
            },
          }
        );
      })
    ).pipe(Atom.setIdleTTL("5 minutes"))
);

export const incomingAccountInvitesAtom =
  incomingAccountInvitesByActorAtom("default");

export const sharedAccountsAtom = sharedAccountsByActorAtom("default");

export const accountAccessGrantsAtom = (
  accountId: number,
  actorUserId: string
) =>
  accountId > 0
    ? accountAccessGrantsByKeyAtom(
        accountAccessGrantsKey(accountId, actorUserId)
      )
    : disabledAccountAccessGrantsAtom;

export const accountInviteTargetsAtom = (accountId: number, query: string) =>
  accountId > 0
    ? accountInviteTargetsByKeyAtom(accountInviteTargetsKey(accountId, query))
    : disabledAccountInviteTargetsAtom;

export const refreshVisibleAccountSharingAtoms = (
  get: Atom.FnContext,
  options: { readonly accountId?: number; readonly actorUserId?: string } = {}
) => {
  get.refresh(incomingAccountInvitesByActorAtom("default"));
  get.refresh(sharedAccountsByActorAtom("default"));

  if (options.accountId !== undefined && options.accountId > 0) {
    get.refresh(
      accountAccessGrantsByKeyAtom(
        accountAccessGrantsKey(
          options.accountId,
          options.actorUserId ?? "default"
        )
      )
    );
  }

  refreshVisibleSquadGroupAtoms(get, { actorUserId: "default" });
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
      refreshVisibleAccountSharingAtoms(get, payload);
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
      refreshVisibleAccountSharingAtoms(get, payload);
      return result;
    })
);
