import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import type { AccountSharingError } from "./account-sharing-error.ts";
import { AccountSharingStoreService } from "./account-sharing-store-service.ts";
import type { AccountAccessInviteSummary } from "./account-sharing-store.ts";

/** Input for responding to an account access invite. */
export interface RespondToAccountAccessInviteInput {
  readonly actorUserId: AppUserId;
  readonly accessId: MargonemAccountAccessId;
  readonly response: "accept" | "decline";
}

export interface AccountAccessInviteResponses {
  /** Accept or decline an account access invite as the invited user. */
  readonly respond: (
    input: RespondToAccountAccessInviteInput
  ) => Effect<AccountAccessInviteSummary, AccountSharingError>;
}

/** Service module that lets invited users accept or decline account access invites. */
// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class AccountAccessInviteResponsesService extends Context.Service<
  AccountAccessInviteResponsesService,
  AccountAccessInviteResponses
>()("@tepirek-revamped/api/squad-builder/AccountAccessInviteResponses") {}

export const layer = Layer.effect(
  AccountAccessInviteResponsesService,
  EffectRuntime.gen(function* makeAccountAccessInviteResponsesService() {
    const store = yield* AccountSharingStoreService;

    return AccountAccessInviteResponsesService.of({
      respond: EffectRuntime.fn("AccountAccessInviteResponses.respond")(
        function* respond(input) {
          const now = new Date(yield* Clock.currentTimeMillis);

          return yield* store.respondToAccountAccessInvite({
            accessId: input.accessId,
            invitedUserId: input.actorUserId,
            now,
            response: input.response,
          });
        }
      ),
    });
  })
);
