import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import {
  InvitationAccessStatusSchema,
  parseInvitationAccessStatus,
} from "./invitation-access-lifecycle.ts";

export {
  ActiveInvitationAccessStatusSchema as ActiveAccountAccessStatusSchema,
  canTransitionInvitationAccess as canTransitionAccountAccess,
  inactiveInvitationAccessStatuses as inactiveAccountAccessStatuses,
} from "./invitation-access-lifecycle.ts";

/** HTTP/API schema for account-access lifecycle status. */
export const AccountAccessStatusSchema = InvitationAccessStatusSchema;
/** Lifecycle status of a `margonem_account_access` row. */
export type AccountAccessStatus = typeof AccountAccessStatusSchema.Type;

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
