import { calculatePointsPerMember } from "@tepirek-revamped/config/application/guild-ledger";
import * as Arr from "effect/Array";
import * as Data from "effect/Data";
import * as HashSet from "effect/HashSet";

import type { SelectableUser } from "@/features/events/bets/user-select-list";

type PointsPreviewVariant = "default" | "destructive" | "secondary";

/** Closed state for the add-flow copy-last-bet action. */
export type LastBetState =
  | {
      readonly _tag: "available";
      readonly members: readonly { readonly userId: string }[];
    }
  | { readonly _tag: "unavailable" };

export const LastBetState = Data.taggedEnum<LastBetState>();

/**
 * Filter users by name case-insensitively.
 */
export const filterUsersBySearch = (
  users: readonly SelectableUser[],
  searchQuery: string
) => {
  const query = searchQuery.toLowerCase();

  return Arr.filter<SelectableUser>((user) =>
    user.name.toLowerCase().includes(query)
  )(users);
};

/**
 * Users available to select: matches the search and is not already selected.
 */
export const getAvailableUsers = (
  users: readonly SelectableUser[] | undefined,
  selectedUserIds: readonly string[],
  searchQuery: string
) => {
  if (users === undefined) {
    return [];
  }

  const selectedUserIdSet = HashSet.fromIterable(selectedUserIds);

  return Arr.filter<SelectableUser>(
    (user) => !HashSet.has(selectedUserIdSet, user.id)
  )(filterUsersBySearch(users, searchQuery));
};

/**
 * Selected users, ordered by the verified-users list (the stable order
 * both flows already use), not by selection click order.
 */
export const getSelectedUsers = (
  users: readonly SelectableUser[] | undefined,
  selectedUserIds: readonly string[]
) => {
  if (users === undefined) {
    return [];
  }

  const selectedUserIdSet = HashSet.fromIterable(selectedUserIds);

  return Arr.filter<SelectableUser>((user) =>
    HashSet.has(selectedUserIdSet, user.id)
  )(users);
};

/**
 * Toggle a user in the selection without mutating the original array.
 */
export const toggleUser = (
  userId: string,
  selectedUserIds: readonly string[]
) => {
  if (Arr.contains(userId)(selectedUserIds)) {
    return Arr.filter<string>((id) => id !== userId)(selectedUserIds);
  }

  return Arr.append(userId)(selectedUserIds);
};

/**
 * Remove a single user from the selection.
 */
export const removeUser = (
  userId: string,
  selectedUserIds: readonly string[]
) => Arr.filter<string>((id) => id !== userId)(selectedUserIds);

/**
 * Restore the initial member IDs (edit flow).
 */
export const restoreSelection = (initialMemberIds: readonly string[]) =>
  Arr.copy(initialMemberIds);

/**
 * Copy the last bet's member IDs into the selection (add flow).
 */
export const copyLastBet = (lastBet: LastBetState) => {
  if (LastBetState.$is("unavailable")(lastBet)) {
    return [];
  }

  return lastBet.members.map((member) => member.userId);
};

/**
 * Decide which empty state to show for the available-users list.
 */
export const getAvailableListState = (input: {
  usersLoading: boolean;
  users: readonly SelectableUser[] | undefined;
  availableUsers: readonly SelectableUser[];
}) => {
  if (input.usersLoading) {
    return "loading";
  }

  if (input.users === undefined || input.users.length === 0) {
    return "no-users";
  }

  if (input.availableUsers.length === 0) {
    return "no-search-results";
  }

  return "has-users";
};

/**
 * Compute the points preview for the edit flow.
 */
export const getPointsPreview = (
  newMemberCount: number,
  currentMemberCount: number
) => {
  const newPointsPerMember = calculatePointsPerMember(newMemberCount);
  const currentPointsPerMember = calculatePointsPerMember(currentMemberCount);

  let variant: PointsPreviewVariant = "secondary";

  if (newPointsPerMember > currentPointsPerMember) {
    variant = "default";
  } else if (newPointsPerMember < currentPointsPerMember) {
    variant = "destructive";
  }

  return {
    currentMemberCount,
    currentPointsPerMember,
    newMemberCount,
    newPointsPerMember,
    variant,
  };
};
