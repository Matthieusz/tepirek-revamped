import type {
  AccountAccessGrantSummarySchema,
  AccountInviteTargetSchema,
} from "@tepirek-revamped/api/protocol/squad-builder/account-sharing/account-sharing-schema";
import { Effect } from "effect";
import * as Data from "effect/Data";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";

import {
  asMargonemAccountAccessId,
  asMargonemAccountId,
} from "@/features/squad-builder/branded-ids";
import { refreshVisibleSquadGroupAtoms } from "@/features/squad-builder/squad-group-atoms";
import { asAppUserId } from "@/lib/branded-ids";
import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

interface RespondToAccountAccessInviteInput {
  readonly accessId: number;
  readonly response: "accept" | "decline";
}
interface RevokeAccountAccessInput {
  readonly accessId: number;
  readonly accountId: number;
  readonly actorUserId: string;
}
interface SendAccountAccessInviteInput {
  readonly accountId: number;
  readonly actorUserId: string;
  readonly invitedUserId: string;
}

class AccountSharingKey extends Data.Class<{
  readonly accountId: number;
  readonly scope: string;
}> {}

type AccountAccessGrant = AccountAccessGrantSummarySchema;
type AccountInviteTarget = AccountInviteTargetSchema;

const disabledAccountAccessGrantsAtom = Atom.make<
  AsyncResult.AsyncResult<readonly AccountAccessGrant[], never>
>(AsyncResult.success([]));
const disabledAccountInviteTargetsAtom = Atom.make<
  AsyncResult.AsyncResult<readonly AccountInviteTarget[], never>
>(AsyncResult.success([]));

export const incomingAccountInvitesAtom = appHttpApiAtom(
  Effect.gen(function* incomingAccountInvitesEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.squadBuilderAccountSharing.listIncomingAccountInvites({
      payload: {},
    });
  })
);

export const sharedAccountsAtom = appHttpApiAtom(
  Effect.gen(function* sharedAccountsEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.squadBuilderAccountSharing.listSharedAccounts({
      payload: {},
    });
  })
);

const accountAccessGrantsByKeyAtom = Atom.family((key: AccountSharingKey) =>
  appHttpApiAtom(
    Effect.gen(function* accountAccessGrantsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.listAccountAccessGrants({
        payload: {
          accountId: yield* asMargonemAccountId(key.accountId),
        },
      });
    })
  ).pipe(Atom.setIdleTTL("5 minutes"))
);

const accountInviteTargetsByKeyAtom = Atom.family((key: AccountSharingKey) =>
  appHttpApiAtom(
    Effect.gen(function* accountInviteTargetsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.searchAccountInviteTargets(
        {
          payload: {
            accountId: yield* asMargonemAccountId(key.accountId),
            query: key.scope,
          },
        }
      );
    })
  ).pipe(Atom.setIdleTTL("5 minutes"))
);

const accountSharingKey = (accountId: number, scope: string) =>
  new AccountSharingKey({ accountId, scope });

export const accountAccessGrantsAtom = (
  accountId: number,
  actorUserId: string
) =>
  accountId > 0
    ? accountAccessGrantsByKeyAtom(accountSharingKey(accountId, actorUserId))
    : disabledAccountAccessGrantsAtom;

export const accountInviteTargetsAtom = (accountId: number, query: string) =>
  accountId > 0
    ? accountInviteTargetsByKeyAtom(accountSharingKey(accountId, query))
    : disabledAccountInviteTargetsAtom;

const refreshVisibleAccountSharingAtoms = (
  get: Atom.FnContext,
  options: { readonly accountId?: number; readonly actorUserId?: string } = {}
) => {
  get.refresh(incomingAccountInvitesAtom);
  get.refresh(sharedAccountsAtom);

  if (options.accountId !== undefined && options.accountId > 0) {
    get.refresh(
      accountAccessGrantsByKeyAtom(
        accountSharingKey(options.accountId, options.actorUserId ?? "default")
      )
    );
  }

  refreshVisibleSquadGroupAtoms(get);
};

/** Mutation atom for sending account access invite. */
export const sendAccountAccessInviteAtom = appHttpApiFn(
  Effect.fn("Web.SquadAccountSharing.sendInvite")(
    function* sendAccountAccessInviteEffect(
      payload: SendAccountAccessInviteInput,
      get: Atom.FnContext
    ) {
      const client = yield* AppHttpApiClient;
      const result =
        yield* client.squadBuilderAccountSharing.sendAccountAccessInvite({
          payload: {
            accountId: yield* asMargonemAccountId(payload.accountId),
            invitedUserId: yield* asAppUserId(payload.invitedUserId),
          },
        });
      refreshVisibleAccountSharingAtoms(get, payload);
      return result;
    }
  )
);

/** Mutation atom for responding to account access invite. */
export const respondToAccountAccessInviteAtom = appHttpApiFn(
  Effect.fn("Web.SquadAccountSharing.respondToInvite")(
    function* respondToAccountAccessInviteEffect(
      payload: RespondToAccountAccessInviteInput,
      get: Atom.FnContext
    ) {
      const client = yield* AppHttpApiClient;
      const result =
        yield* client.squadBuilderAccountSharing.respondToAccountAccessInvite({
          payload: {
            accessId: yield* asMargonemAccountAccessId(payload.accessId),
            response: payload.response,
          },
        });
      refreshVisibleAccountSharingAtoms(get);
      return result;
    }
  )
);

/** Mutation atom for revoking account access. */
export const revokeAccountAccessAtom = appHttpApiFn(
  Effect.fn("Web.SquadAccountSharing.revokeAccess")(
    function* revokeAccountAccessEffect(
      payload: RevokeAccountAccessInput,
      get: Atom.FnContext
    ) {
      const client = yield* AppHttpApiClient;
      const result =
        yield* client.squadBuilderAccountSharing.revokeAccountAccess({
          payload: {
            accessId: yield* asMargonemAccountAccessId(payload.accessId),
          },
        });
      refreshVisibleAccountSharingAtoms(get, payload);
      return result;
    }
  )
);
