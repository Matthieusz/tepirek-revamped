import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { AppUserId } from "../app-user-id.js";
import { fail, isFailure, success } from "../outcome.js";
import type { Outcome } from "../outcome.js";
import type { SquadGroupId } from "../squad-group-id.js";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.js";
import type {
  SquadGroupInvitationSummary,
  SquadGroupSharingStore,
} from "./squad-group-store.js";

export class SendSquadGroupEditorInvite {
  private readonly store: SquadGroupSharingStore;
  private readonly clock: Clock;

  constructor(store: SquadGroupSharingStore, clock: Clock) {
    this.store = store;
    this.clock = clock;
  }

  /** Send or re-send a squad group editor invitation. */
  async send(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
    readonly invitedUserId: AppUserId;
  }): Promise<Outcome<SquadGroupInvitationSummary, SquadGroupSharingError>> {
    const access = await this.store.authorizeSquadGroupOwner({
      actorUserId: input.actorUserId,
      groupId: input.groupId,
    });

    if (isFailure(access)) {
      return fail(access.error);
    }

    if (input.actorUserId === input.invitedUserId) {
      return fail({ _tag: "CannotInviteSelf" });
    }

    const target = await this.store.findVerifiedSquadEditorInviteTarget({
      targetUserId: input.invitedUserId,
    });

    if (isFailure(target)) {
      return fail(target.error);
    }

    const invite = await this.store.upsertSquadGroupEditorInvite({
      groupId: input.groupId,
      invitedUserId: target.value.userId,
      now: this.clock.now(),
      ownerUserId: input.actorUserId,
    });

    if (isFailure(invite)) {
      return fail(invite.error);
    }

    return success(invite.value);
  }
}
