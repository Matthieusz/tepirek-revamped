import type { AppUserId } from "./app-user-id";
import type { Clock } from "./preview-margonem-profile-import";
import { err, isError, ok } from "./result";
import type { Result } from "./result";
import type {
  SquadGroupInvitationSummary,
  SquadGroupSharingStore,
} from "./squad-builder-store";
import type { SquadGroupId } from "./squad-group-id";
import type { SquadGroupSharingError } from "./squad-group-sharing-error";

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
  }): Promise<Result<SquadGroupInvitationSummary, SquadGroupSharingError>> {
    const access = await this.store.authorizeSquadGroupOwner({
      actorUserId: input.actorUserId,
      groupId: input.groupId,
    });

    if (isError(access)) {
      return err(access.error);
    }

    if (input.actorUserId === input.invitedUserId) {
      return err({ _tag: "CannotInviteSelf" });
    }

    const target = await this.store.findVerifiedSquadEditorInviteTarget({
      targetUserId: input.invitedUserId,
    });

    if (isError(target)) {
      return err(target.error);
    }

    const invite = await this.store.upsertSquadGroupEditorInvite({
      groupId: input.groupId,
      invitedUserId: target.value.userId,
      now: this.clock.now(),
      ownerUserId: input.actorUserId,
    });

    if (isError(invite)) {
      return err(invite.error);
    }

    return ok(invite.value);
  }
}
