import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseInviteTargetQuery } from "../../../domain/squad-builder/invite-target-search.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { ActorDoesNotOwnMargonemAccount } from "../squad-groups/squad-group-errors.ts";
import type { AccountSharingError } from "./account-sharing-error.ts";
import { AccountSharingStoreService } from "./account-sharing-store-service.ts";
import type { AccountInviteTarget } from "./account-sharing-store.ts";

export interface SearchAccountInviteTargetsInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly query: string;
}

export interface AccountInviteTargets {
  /** Search verified users the account owner may invite. */
  readonly search: (
    input: SearchAccountInviteTargetsInput
  ) => Effect<readonly AccountInviteTarget[], AccountSharingError>;
}

/** Service module that searches verified users an owner may invite. */
// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class AccountInviteTargetsService extends Context.Service<
  AccountInviteTargetsService,
  AccountInviteTargets
>()("@tepirek-revamped/api/squad-builder/AccountInviteTargets") {}

export const layer = Layer.effect(
  AccountInviteTargetsService,
  EffectRuntime.gen(function* makeAccountInviteTargetsService() {
    const store = yield* AccountSharingStoreService;

    return AccountInviteTargetsService.of({
      search: EffectRuntime.fn("AccountInviteTargets.search")(
        function* search(input) {
          const query = yield* parseInviteTargetQuery(input.query);
          const owned = yield* store.findOwnedAccountForSharing({
            accountId: input.accountId,
            actorUserId: input.actorUserId,
          });

          if (owned.ownerUserId !== input.actorUserId) {
            return yield* new ActorDoesNotOwnMargonemAccount();
          }

          return yield* store.searchInviteTargets({
            accountId: input.accountId,
            actorUserId: input.actorUserId,
            query,
          });
        }
      ),
    });
  })
);
