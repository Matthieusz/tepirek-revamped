import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import { serviceUse } from "../../../effect/service-use.js";
import type { AccountSharingError } from "./account-sharing-error.js";
import { AccountSharingStoreService } from "./account-sharing-store-service.js";
import type { AccountAccessInviteSummary } from "./account-sharing-store.js";
import type { RespondToAccountAccessInviteInput } from "./respond-to-account-access-invite.js";

export interface Interface {
  /** Accept or decline an account access invite as the invited user. */
  readonly respond: (
    input: RespondToAccountAccessInviteInput
  ) => Effect<AccountAccessInviteSummary, AccountSharingError>;
}

/** Service module that lets invited users accept or decline account access invites. */
// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/AccountAccessInviteResponses"
) {}

export const use = serviceUse(Service);

export const layer = Layer.effect(
  Service,
  EffectRuntime.gen(function* makeAccountAccessInviteResponsesService() {
    const store = yield* AccountSharingStoreService;

    return {
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
    };
  })
);
