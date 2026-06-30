import type { AppUserId } from "./app-user-id";
import type { Clock } from "./preview-margonem-profile-import";
import { err, isError, ok } from "./result";
import type { Result } from "./result";
import type {
  SquadGroupInvitationSummary,
  SquadGroupSharingStore,
} from "./squad-builder-store";
import type { SquadGroupInvitationId } from "./squad-group-invitation-id";
import type { SquadGroupSharingError } from "./squad-group-sharing-error";

export class RevokeSquadGroupEditor {
  private readonly store: SquadGroupSharingStore;
  private readonly clock: Clock;

  constructor(store: SquadGroupSharingStore, clock: Clock) {
    this.store = store;
    this.clock = clock;
  }

  /** Revoke pending or accepted editor access as the squad group owner. */
  async revoke(input: {
    readonly actorUserId: AppUserId;
    readonly invitationId: SquadGroupInvitationId;
  }): Promise<Result<SquadGroupInvitationSummary, SquadGroupSharingError>> {
    const result = await this.store.revokeSquadGroupEditor({
      invitationId: input.invitationId,
      now: this.clock.now(),
      ownerUserId: input.actorUserId,
    });

    if (isError(result)) {
      return err(result.error);
    }

    return ok(result.value);
  }
}
