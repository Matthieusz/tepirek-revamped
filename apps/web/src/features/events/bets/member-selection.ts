import { calculatePointsPerMember } from "@/features/events/bets/bet-helpers";
import type { SelectableUser } from "@/features/events/bets/user-select-list";

/**
 * Deep Hero bet member picker model.
 *
 * Pure selection logic shared by the add-bet and edit-bet flows. Owns
 * search filtering, available/selected user derivation, toggle/clear/
 * restore/copy actions, empty-state decisions, and the points preview.
 * React rendering lives in the picker component; this module only deals
 * with selection shape and rules.
 */

type PointsPreviewVariant = "default" | "destructive" | "secondary";

interface PointsPreview {
  currentMemberCount: number;
  currentPointsPerMember: number;
  newMemberCount: number;
  newPointsPerMember: number;
  variant: PointsPreviewVariant;
}

/**
 * Filter users by name case-insensitively.
 */
export const filterUsersBySearch = (
  users: readonly SelectableUser[],
  searchQuery: string
): SelectableUser[] => {
  const query = searchQuery.toLowerCase();
  return users.filter((user) => user.name.toLowerCase().includes(query));
};

/**
 * Users available to select: matches the search and is not already selected.
 */
export const getAvailableUsers = (
  users: readonly SelectableUser[] | undefined,
  selectedUserIds: readonly string[],
  searchQuery: string
): SelectableUser[] => {
  if (users === undefined) {
    return [];
  }
  const selectedUserIdSet = new Set(selectedUserIds);
  return filterUsersBySearch(users, searchQuery).filter(
    (user) => !selectedUserIdSet.has(user.id)
  );
};

/**
 * Selected users, ordered by the verified-users list (the stable order
 * both flows already use), not by selection click order.
 */
export const getSelectedUsers = (
  users: readonly SelectableUser[] | undefined,
  selectedUserIds: readonly string[]
): SelectableUser[] => {
  if (users === undefined) {
    return [];
  }
  const selectedUserIdSet = new Set(selectedUserIds);
  return users.filter((user) => selectedUserIdSet.has(user.id));
};

/**
 * Toggle a user in the selection without mutating the original array.
 */
export const toggleUser = (
  userId: string,
  selectedUserIds: readonly string[]
): string[] => {
  if (selectedUserIds.includes(userId)) {
    return selectedUserIds.filter((id) => id !== userId);
  }
  return [...selectedUserIds, userId];
};

/**
 * Remove a single user from the selection.
 */
export const removeUser = (
  userId: string,
  selectedUserIds: readonly string[]
): string[] => selectedUserIds.filter((id) => id !== userId);

/**
 * Clear the entire selection.
 */
export const clearSelection = (): string[] => [];

/**
 * Restore the initial member IDs (edit flow).
 */
export const restoreSelection = (
  initialMemberIds: readonly string[]
): string[] => [...initialMemberIds];

/**
 * Copy the last bet's member IDs into the selection (add flow).
 */
export const copyLastBet = (lastBet?: {
  members: { userId: string }[];
}): string[] => {
  if (!lastBet) {
    return [];
  }
  return lastBet.members.map((member) => member.userId);
};

type PickerEmptyState =
  | "loading"
  | "no-users"
  | "no-search-results"
  | "has-users";

/**
 * Decide which empty state to show for the available-users list.
 */
export const getAvailableListState = (input: {
  usersLoading: boolean;
  users: readonly SelectableUser[] | undefined;
  availableUsers: readonly SelectableUser[];
}): PickerEmptyState => {
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
): PointsPreview => {
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
