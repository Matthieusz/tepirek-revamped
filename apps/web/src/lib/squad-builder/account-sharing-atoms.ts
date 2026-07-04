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

type AccountAccessGrantsInput = typeof AccountAccessGrantsPayload.Type;
type ActorInput = typeof ActorPayload.Type;
type RespondToAccountAccessInviteInput =
  typeof RespondToAccountAccessInvitePayload.Type;
type RevokeAccountAccessInput = typeof RevokeAccountAccessPayload.Type;
type SearchAccountInviteTargetsInput =
  typeof SearchAccountInviteTargetsPayload.Type;
type SendAccountAccessInviteInput = typeof SendAccountAccessInvitePayload.Type;

/** Resource atom for incoming squad-builder account invitations. */
export const incomingAccountInvitesAtom = (payload: ActorInput) =>
  appHttpApiAtom(
    Effect.gen(function* listIncomingAccountInvitesEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.listIncomingAccountInvites(
        {
          payload,
        }
      );
    })
  );

/** Resource atom for accounts shared with the current actor. */
export const sharedAccountsAtom = (payload: ActorInput) =>
  appHttpApiAtom(
    Effect.gen(function* listSharedAccountsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.listSharedAccounts({
        payload,
      });
    })
  );

/** Resource atom for access grants on one account. */
export const accountAccessGrantsAtom = (payload: AccountAccessGrantsInput) =>
  appHttpApiAtom(
    Effect.gen(function* listAccountAccessGrantsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.listAccountAccessGrants({
        payload,
      });
    })
  );

/** Resource atom for account invite target search. */
export const accountInviteTargetsAtom = (
  payload: SearchAccountInviteTargetsInput
) =>
  appHttpApiAtom(
    Effect.gen(function* searchAccountInviteTargetsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.searchAccountInviteTargets(
        {
          payload,
        }
      );
    })
  );

/** Mutation atom for sending an account access invite. */
export const sendAccountAccessInviteAtom = appHttpApiFn(
  (payload: SendAccountAccessInviteInput) =>
    Effect.gen(function* sendAccountAccessInviteEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.sendAccountAccessInvite({
        payload,
      });
    })
);

/** Mutation atom for responding to an account access invite. */
export const respondToAccountAccessInviteAtom = appHttpApiFn(
  (payload: RespondToAccountAccessInviteInput) =>
    Effect.gen(function* respondToAccountAccessInviteEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.respondToAccountAccessInvite(
        {
          payload,
        }
      );
    })
);

/** Mutation atom for revoking account access. */
export const revokeAccountAccessAtom = appHttpApiFn(
  (payload: RevokeAccountAccessInput) =>
    Effect.gen(function* revokeAccountAccessEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.revokeAccountAccess({
        payload,
      });
    })
);
