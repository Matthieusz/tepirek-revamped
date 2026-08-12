import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import {
  ActiveInvitationAccessStatusSchema,
  canTransitionInvitationAccess,
  inactiveInvitationAccessStatuses,
  InvitationAccessStatusSchema,
  parseInvitationAccessStatus,
} from "./invitation-access-lifecycle.ts";

/** HTTP/API schema for account-access lifecycle status. */
export const AccountAccessStatusSchema = InvitationAccessStatusSchema;
/** Lifecycle status of a `margonem_account_access` row. */
export type AccountAccessStatus = typeof AccountAccessStatusSchema.Type;

/** HTTP/API schema for account-access statuses that grant account access. */
export const ActiveAccountAccessStatusSchema =
  ActiveInvitationAccessStatusSchema;

/** Statuses that grant the recipient no character usage. */
export { inactiveInvitationAccessStatuses as inactiveAccountAccessStatuses };

/** Expected failure when a persisted status string is not a known status. */
export class InvalidAccountAccessStatus extends Schema.TaggedErrorClass<InvalidAccountAccessStatus>()(
  "InvalidAccountAccessStatus",
  { value: Schema.String }
) {}

/** Parse a persisted status string into the domain status. */
export const parseAccountAccessStatus = (
  value: string
): Effect.Effect<AccountAccessStatus, InvalidAccountAccessStatus> =>
  parseInvitationAccessStatus(value).pipe(
    Effect.mapError(() => new InvalidAccountAccessStatus({ value }))
  );

/** Whether an access row may move from `from` to `to`. */
export const canTransitionAccountAccess = canTransitionInvitationAccess;
