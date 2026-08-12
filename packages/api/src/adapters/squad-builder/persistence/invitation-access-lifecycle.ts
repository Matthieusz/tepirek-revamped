import * as Effect from "effect/Effect";

import type {
  InvitationAccessStatus,
  InvitationAccessTransitionNotAllowed,
} from "../../../domain/squad-builder/invitation-access-lifecycle.ts";
import { transitionInvitationAccess } from "../../../domain/squad-builder/invitation-access-lifecycle.ts";

/** A persisted invitation/access row after one legal lifecycle transition. */
export interface TransitionedInvitationAccessRow<A> {
  readonly previousStatus: InvitationAccessStatus;
  readonly nextStatus: InvitationAccessStatus;
  readonly result: A;
}

/**
 * Validate and persist one lifecycle transition inside the caller's transaction.
 *
 * The query, status parser, and feature error remain adapter-owned; this helper
 * shares only the invariant and the validate-then-update control-flow shape.
 */
export const transitionInvitationAccessRow = <
  A,
  ParseError,
  UpdateError,
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
  readonly update: (
    nextStatus: InvitationAccessStatus
  ) => Effect.Effect<A, UpdateError>;
}): Effect.Effect<
  TransitionedInvitationAccessRow<A>,
  ParseError | TransitionError | UpdateError
> =>
  Effect.gen(function* transitionInvitationAccessRowEffect() {
    const previousStatus = yield* input.parseStatus(input.currentStatus);
    const nextStatus = yield* transitionInvitationAccess(
      previousStatus,
      input.nextStatus
    ).pipe(Effect.mapError(input.onTransitionNotAllowed));
    const result = yield* input.update(nextStatus);

    return { nextStatus, previousStatus, result };
  });
