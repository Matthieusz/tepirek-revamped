import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { AppUserId } from "../app-user-id.js";
import { fail, isFailure, success } from "../outcome.js";
import type { Outcome } from "../outcome.js";
import type { SquadGroupInvitationId } from "../squad-group-invitation-id.js";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.js";
import type {
  SquadGroupInvitationSummary,
  SquadGroupSharingStore,
} from "./squad-group-store.js";

export class RespondToSquadGroupInvite {
  private readonly store: SquadGroupSharingStore;
  private readonly clock: Clock;

  constructor(store: SquadGroupSharingStore, clock: Clock) {
    this.store = store;
    this.clock = clock;
  }

  /** Accept or decline a squad group editor invite as the invited user. */
  async respond(input: {
    readonly actorUserId: AppUserId;
    readonly invitationId: SquadGroupInvitationId;
    readonly response: "accept" | "decline";
  }): Promise<Outcome<SquadGroupInvitationSummary, SquadGroupSharingError>> {
    const result = await this.store.respondToSquadGroupInvite({
      invitationId: input.invitationId,
      invitedUserId: input.actorUserId,
      now: this.clock.now(),
      response: input.response,
    });

    if (isFailure(result)) {
      return fail(result.error);
    }

    return success(result.value);
  }
}
