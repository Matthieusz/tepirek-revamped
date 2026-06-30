import { err, ok } from "./result";
import type { Result } from "./result";

/** Lifecycle status of a `margonem_account_access` row. */
export type AccountAccessStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "revoked";

/** Statuses that grant the recipient no character usage. */
export const inactiveAccountAccessStatuses: readonly AccountAccessStatus[] = [
  "declined",
  "revoked",
];

/** Statuses that grant the recipient character usage. */
export const activeAccountAccessStatuses: readonly AccountAccessStatus[] = [
  "pending",
  "accepted",
];

/** Expected failure when a persisted status string is not a known status. */
export interface InvalidAccountAccessStatus {
  readonly _tag: "InvalidAccountAccessStatus";
  readonly value: string;
}

const knownStatuses: readonly AccountAccessStatus[] = [
  "pending",
  "accepted",
  "declined",
  "revoked",
];

const isKnownStatus = (value: string): value is AccountAccessStatus =>
  (knownStatuses as readonly string[]).includes(value);

/** Parse a persisted status string into the domain status. */
export const parseAccountAccessStatus = (
  value: string
): Result<AccountAccessStatus, InvalidAccountAccessStatus> => {
  if (!isKnownStatus(value)) {
    return err({ _tag: "InvalidAccountAccessStatus", value });
  }

  return ok(value);
};

/** Legal transitions for account access rows. */
export type AccountAccessTransition =
  | {
      readonly from: "pending";
      readonly to: "accepted";
      readonly actor: "invitedUser";
    }
  | {
      readonly from: "pending";
      readonly to: "declined";
      readonly actor: "invitedUser";
    }
  | {
      readonly from: "pending" | "accepted";
      readonly to: "revoked";
      readonly actor: "accountOwner";
    }
  | {
      readonly from: "declined" | "revoked";
      readonly to: "pending";
      readonly actor: "accountOwner";
    };

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
