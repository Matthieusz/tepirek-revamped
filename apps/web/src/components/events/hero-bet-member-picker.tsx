import { Copy, CopyX, Search, User, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { UserSelectList } from "@/components/events/user-select-list";
import type { SelectableUser } from "@/components/events/user-select-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAvailableListState,
  getAvailableUsers,
  getPointsPreview,
  getSelectedUsers,
  removeUser,
  toggleUser,
  clearSelection,
  copyLastBet,
  restoreSelection,
} from "@/lib/hero-bet-member-picker";

/**
 * Deep Hero bet member picker component.
 *
 * One implementation of member selection for the add-bet and edit-bet
 * flows. Owns search state, available/selected derivation, empty states,
 * the toggle/clear/restore/copy actions, and the optional points preview.
 * Router mutations and submission stay in the calling page/modal.
 */

interface HeroBetMemberPickerProps {
  users: SelectableUser[] | undefined;
  usersLoading: boolean;
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  /** Layout variant: "add" uses a card grid, "edit" uses a list + pills. */
  variant: "add" | "edit";
  /** Show the clear-selection action. */
  clearEnabled?: boolean;
  /** Show the restore-to-initial action (edit flow). */
  restoreEnabled?: boolean;
  initialMemberIds?: string[];
  /** Show the copy-last-bet action (add flow). */
  copyLastBetEnabled?: boolean;
  lastBet?: { members: { userId: string }[] } | undefined;
  lastBetAvailable?: boolean;
  /** Show the points preview (edit flow). */
  pointsPreview?: {
    currentMemberCount: number;
  };
  /** Accessible id prefix for checkbox/label pairing. */
  idPrefix?: string;
}

const AvailableListEmptyState = ({
  state,
}: {
  state: ReturnType<typeof getAvailableListState>;
}) => {
  if (state === "loading") {
    return <p className="text-muted-foreground text-sm">Ładowanie...</p>;
  }
  if (state === "no-users") {
    return (
      <p className="text-muted-foreground text-sm">
        Brak zweryfikowanych graczy
      </p>
    );
  }
  if (state === "no-search-results") {
    return (
      <p className="text-muted-foreground text-sm">
        Nie znaleziono graczy pasujących do wyszukiwania
      </p>
    );
  }
  return null;
};

export const HeroBetMemberPicker = ({
  users,
  usersLoading,
  selectedUserIds,
  onChange,
  variant,
  clearEnabled = false,
  restoreEnabled = false,
  initialMemberIds,
  copyLastBetEnabled = false,
  lastBet,
  lastBetAvailable = false,
  pointsPreview,
  idPrefix = "user",
}: HeroBetMemberPickerProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const availableUsers = getAvailableUsers(users, selectedUserIds, searchQuery);
  const selectedUsers = getSelectedUsers(users, selectedUserIds);
  const availableCount =
    users?.filter((user) => !selectedUserIds.includes(user.id)).length ?? 0;
  const listState = getAvailableListState({
    availableUsers,
    users,
    usersLoading,
  });

  const preview =
    pointsPreview !== undefined
      ? getPointsPreview(
          selectedUserIds.length,
          pointsPreview.currentMemberCount
        )
      : null;

  return (
    <div className="grid gap-1.5">
      {preview && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Obecnie</p>
              <p className="font-semibold text-lg">
                {preview.currentMemberCount} os.
              </p>
              <p className="text-muted-foreground text-xs">
                {preview.currentPointsPerMember} pkt/os
              </p>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Po zmianie</p>
              <p className="font-semibold text-lg">
                {preview.newMemberCount} os.
              </p>
              <Badge variant={preview.variant}>
                {preview.newPointsPerMember} pkt/os
              </Badge>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Label>Gracze ({availableCount} dostępnych)</Label>
        <div className="flex flex-wrap gap-2">
          {clearEnabled && (
            <Button
              disabled={selectedUserIds.length === 0}
              onClick={() => {
                onChange(clearSelection());
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <CopyX className="size-4" />
              {variant === "edit" ? (
                <span>Wyczyść</span>
              ) : (
                <>
                  <span className="hidden sm:inline">Odznacz wszystkich</span>
                  <span className="sm:hidden">Odznacz</span>
                </>
              )}
            </Button>
          )}
          {restoreEnabled && initialMemberIds !== undefined && (
            <Button
              onClick={() => {
                onChange(restoreSelection(initialMemberIds));
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <Copy className="size-4" />
              <span>Przywróć</span>
            </Button>
          )}
          {copyLastBetEnabled && (
            <Button
              disabled={!lastBetAvailable}
              onClick={() => {
                onChange(copyLastBet(lastBet));
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <Copy className="size-4" />
              <span className="hidden sm:inline">Kopiuj ostatnie</span>
              <span className="sm:hidden">Kopiuj</span>
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
        <Input
          aria-label="Szukaj gracza"
          className="pl-9"
          onChange={(e) => {
            setSearchQuery(e.target.value);
          }}
          placeholder="Szukaj gracza..."
          type="text"
          value={searchQuery}
        />
      </div>

      <div
        className={
          variant === "edit"
            ? "max-h-48 overflow-y-auto rounded-md border p-4"
            : "max-h-64 overflow-y-auto rounded-md border p-4"
        }
      >
        {variant === "edit" && (
          <p className="mb-2 text-muted-foreground text-sm">Dostępni gracze:</p>
        )}
        {listState === "has-users" ? (
          variant === "add" ? (
            <UserSelectList
              onToggleUser={(userId) => {
                onChange(toggleUser(userId, selectedUserIds));
              }}
              selectedUserIds={selectedUserIds}
              users={availableUsers}
            />
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {availableUsers.map((user) => (
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  htmlFor={`${idPrefix}-${user.id}`}
                  key={user.id}
                >
                  <Checkbox
                    id={`${idPrefix}-${user.id}`}
                    onCheckedChange={() => {
                      onChange(toggleUser(user.id, selectedUserIds));
                    }}
                  />
                  <Avatar className="size-8">
                    <AvatarImage
                      alt={user.name}
                      src={user.image ?? undefined}
                    />
                    <AvatarFallback>
                      <User className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate font-normal">{user.name}</span>
                </label>
              ))}
            </div>
          )
        ) : (
          <AvailableListEmptyState state={listState} />
        )}
      </div>

      {selectedUserIds.length > 0 && (
        <SelectedUsers
          idPrefix={idPrefix}
          onChange={onChange}
          selectedUserIds={selectedUserIds}
          selectedUsers={selectedUsers}
          variant={variant}
        />
      )}
    </div>
  );
};

interface SelectedUsersProps {
  selectedUserIds: string[];
  selectedUsers: SelectableUser[];
  onChange: (userIds: string[]) => void;
  variant: "add" | "edit";
  idPrefix: string;
}

const SelectedUsers = ({
  selectedUserIds,
  selectedUsers,
  onChange,
  variant,
  idPrefix,
}: SelectedUsersProps): ReactNode => {
  const label =
    variant === "edit"
      ? `Wybrani gracze (${selectedUserIds.length}):`
      : `Gracze (${selectedUserIds.length} wybranych)`;

  if (variant === "add") {
    return (
      <div>
        <Label className="mb-2">{label}</Label>
        <div className="rounded-md border border-muted bg-muted/30">
          <div className="p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
              {selectedUsers.map((user) => (
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-primary bg-primary/5 p-3 transition-colors hover:bg-muted/50"
                  htmlFor={`selected-${idPrefix}-${user.id}`}
                  key={user.id}
                >
                  <Checkbox
                    checked
                    id={`selected-${idPrefix}-${user.id}`}
                    onCheckedChange={() => {
                      onChange(removeUser(user.id, selectedUserIds));
                    }}
                  />
                  <Avatar className="size-8">
                    <AvatarImage
                      alt={user.name}
                      src={user.image ?? undefined}
                    />
                    <AvatarFallback>
                      <User className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate font-normal">{user.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label className="mb-2">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {selectedUsers.map((user) => (
          <div
            className="flex items-center gap-2 rounded-full border bg-muted/30 py-1 pr-3 pl-1"
            key={user.id}
          >
            <Avatar className="size-6">
              <AvatarImage alt={user.name} src={user.image ?? undefined} />
              <AvatarFallback className="text-xs">
                <User className="size-3" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{user.name}</span>
            <button
              className="flex size-5 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => {
                onChange(removeUser(user.id, selectedUserIds));
              }}
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
