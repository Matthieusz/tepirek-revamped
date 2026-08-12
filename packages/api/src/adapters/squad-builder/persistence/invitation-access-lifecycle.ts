import * as Effect from "effect/Effect";

import type {
  InvitationAccessStatus,
  InvitationAccessTransitionNotAllowed,
} from "../../../domain/squad-builder/invitation-access-lifecycle.ts";
import { transitionInvitationAccess } from "../../../domain/squad-builder/invitation-access-lifecycle.ts";

/** The validated status change shared by invitation persistence adapters. */
export interface ValidatedInvitationAccessTransition {
  readonly previousStatus: InvitationAccessStatus;
  readonly nextStatus: InvitationAccessStatus;
}

/**
 * Parse and validate a lifecycle transition.
 *
 * The caller owns the table-specific transaction and must lock the persisted
 * row before invoking this helper. Keeping the SQL in each adapter makes the
 * natural key, authorization joins, and lock scope explicit.
 */
export const validateInvitationAccessTransition = <
  ParseError,
  TransitionError,
>(input: {
  readonly currentStatus: string;
  readonly nextStatus: InvitationAccessStatus;
  readonly parseStatus: (
    value: string
  ) => Effect.Effect<InvitationAccessStatus, ParseError>;
  readonly onTransitionNotAllowed: (
    error: InvitationAccessTransitionNotAllowed
  ) => TransitionError;
}): Effect.Effect<
  ValidatedInvitationAccessTransition,
  ParseError | TransitionError
> =>
  Effect.gen(function* validateInvitationAccessTransitionEffect() {
    const previousStatus = yield* input.parseStatus(input.currentStatus);
    const nextStatus = yield* transitionInvitationAccess(
      previousStatus,
      input.nextStatus
    ).pipe(Effect.mapError(input.onTransitionNotAllowed));

    return { nextStatus, previousStatus };
  });
