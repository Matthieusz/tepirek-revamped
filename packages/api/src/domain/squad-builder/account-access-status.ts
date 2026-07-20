import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/** HTTP/API schema for account-access lifecycle status. */
export const AccountAccessStatusSchema = Schema.Literals([
  "pending",
  "accepted",
  "declined",
  "revoked",
]);
/** Lifecycle status of a `margonem_account_access` row. */
export type AccountAccessStatus = typeof AccountAccessStatusSchema.Type;

/** HTTP/API schema for account-access statuses that grant account access. */
export const ActiveAccountAccessStatusSchema = Schema.Literals([
  "pending",
  "accepted",
]);

/** Statuses that grant the recipient no character usage. */
export const inactiveAccountAccessStatuses: readonly AccountAccessStatus[] = [
  "declined",
  "revoked",
];

/** Expected failure when a persisted status string is not a known status. */
export class InvalidAccountAccessStatus extends Schema.TaggedErrorClass<InvalidAccountAccessStatus>()(
  "InvalidAccountAccessStatus",
  { value: Schema.String }
) {}

/** Parse a persisted status string into the domain status. */
export const parseAccountAccessStatus = (
  value: string
): Effect.Effect<AccountAccessStatus, InvalidAccountAccessStatus> =>
  Schema.decodeUnknownEffect(AccountAccessStatusSchema)(value).pipe(
    Effect.mapError(() => new InvalidAccountAccessStatus({ value }))
  );

/** Whether an access row may move from `from` to `to`. */
export const canTransitionAccountAccess = (
  from: AccountAccessStatus,
  to: AccountAccessStatus
): boolean => {
  if (from === "pending" && to === "accepted") {
    return true;
  }

  if (from === "pending" && to === "declined") {
    return true;
  }

  if ((from === "pending" || from === "accepted") && to === "revoked") {
    return true;
  }

  if ((from === "declined" || from === "revoked") && to === "pending") {
    return true;
  }

  return false;
};
