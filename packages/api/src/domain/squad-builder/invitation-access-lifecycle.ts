/* eslint-disable max-classes-per-file -- Lifecycle parsing and transition failures share this domain boundary. */
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/** The lifecycle states shared by account access and group editor invitations. */
export const InvitationAccessStatusSchema = Schema.Literals([
  "pending",
  "accepted",
  "declined",
  "revoked",
]);

/** The lifecycle state of an invitation or access grant. */
export type InvitationAccessStatus = typeof InvitationAccessStatusSchema.Type;

/** States that currently grant the recipient access. */
export const ActiveInvitationAccessStatusSchema = Schema.Literals([
  "pending",
  "accepted",
]);

/** States that do not grant the recipient access. */
export const inactiveInvitationAccessStatuses: readonly InvitationAccessStatus[] =
  ["declined", "revoked"];

/** The complete legal transition table for invitation/access rows. */
export const invitationAccessTransitionTable = {
  accepted: ["revoked"],
  declined: ["pending"],
  pending: ["accepted", "declined", "revoked"],
  revoked: ["pending"],
} as const satisfies Readonly<
  Record<InvitationAccessStatus, readonly InvitationAccessStatus[]>
>;

/** Failure returned when a lifecycle transition is not legal. */
export class InvitationAccessTransitionNotAllowed extends Schema.TaggedErrorClass<InvitationAccessTransitionNotAllowed>()(
  "InvitationAccessTransitionNotAllowed",
  {
    attempted: InvitationAccessStatusSchema,
    currentStatus: InvitationAccessStatusSchema,
  }
) {}

/** Failure returned when a persisted lifecycle status is unknown. */
export class InvalidInvitationAccessStatus extends Schema.TaggedErrorClass<InvalidInvitationAccessStatus>()(
  "InvalidInvitationAccessStatus",
  { value: Schema.String }
) {}

/** Parse a persisted status into the shared lifecycle state. */
export const parseInvitationAccessStatus = (
  value: string
): Effect.Effect<InvitationAccessStatus, InvalidInvitationAccessStatus> =>
  Schema.decodeUnknownEffect(InvitationAccessStatusSchema)(value).pipe(
    Effect.mapError(() => new InvalidInvitationAccessStatus({ value }))
  );

/** Whether the transition table contains a transition from `from` to `to`. */
export const canTransitionInvitationAccess = (
  from: InvitationAccessStatus,
  to: InvitationAccessStatus
): boolean => {
  const allowedStatuses: readonly InvitationAccessStatus[] =
    invitationAccessTransitionTable[from];

  return allowedStatuses.includes(to);
};

/**
 * Apply the shared invitation/access lifecycle transition.
 *
 * The returned status is the requested next status. Feature adapters map the
 * shared transition failure to their feature-specific error type.
 */
export const transitionInvitationAccess = (
  currentStatus: InvitationAccessStatus,
  nextStatus: InvitationAccessStatus
): Effect.Effect<
  InvitationAccessStatus,
  InvitationAccessTransitionNotAllowed
> => {
  if (canTransitionInvitationAccess(currentStatus, nextStatus)) {
    return Effect.succeed(nextStatus);
  }

  return Effect.fail(
    new InvitationAccessTransitionNotAllowed({
      attempted: nextStatus,
      currentStatus,
    })
  );
};
