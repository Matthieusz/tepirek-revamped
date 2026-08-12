import * as HashSet from "effect/HashSet";
import { Copy, CopyX, Search, User, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  copyLastBet,
  getAvailableListState,
  getAvailableUsers,
  getPointsPreview,
  getSelectedUsers,
  removeUser,
  restoreSelection,
  toggleUser,
} from "@/features/events/bets/member-selection";
import type { LastBetState } from "@/features/events/bets/member-selection";
import { UserSelectList } from "@/features/events/bets/user-select-list";
import type { SelectableUser } from "@/features/events/bets/user-select-list";

interface HeroBetMemberPickerBaseProps {
  readonly fieldName?: string;
  readonly users: SelectableUser[] | undefined;
  readonly usersLoading: boolean;
  readonly selectedUserIds: string[];
  readonly onBlur?: () => void;
  readonly onChange: (userIds: string[]) => void;
  /** Accessible id prefix for checkbox/label pairing. */
  readonly idPrefix?: string;
}

interface AddPickerProps extends HeroBetMemberPickerBaseProps {
  readonly variant: "add";
  readonly lastBet: LastBetState;
}

interface EditPickerProps extends HeroBetMemberPickerBaseProps {
  readonly variant: "edit";
  readonly initialMemberIds: readonly string[];
  readonly pointsPreview: {
    readonly currentMemberCount: number;
  };
}

type HeroBetMemberPickerProps = AddPickerProps | EditPickerProps;

const AvailableListEmptyState = ({
  state,
}: {
  readonly state: ReturnType<typeof getAvailableListState>;
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

interface SelectionActionsProps {
  readonly variant: HeroBetMemberPickerProps["variant"];
  readonly selectedUserIds: string[];
  readonly onBlur?: () => void;
  readonly onChange: (userIds: string[]) => void;
}

type SelectionActionsWithModeProps =
  | (Omit<SelectionActionsProps, "variant"> &
      Pick<AddPickerProps, "lastBet"> & { readonly variant: "add" })
  | (Omit<SelectionActionsProps, "variant"> &
      Pick<EditPickerProps, "initialMemberIds"> & { readonly variant: "edit" });

const SelectionActions = (props: SelectionActionsWithModeProps) => {
  const { onBlur, onChange, selectedUserIds, variant } = props;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        disabled={selectedUserIds.length === 0}
        onClick={() => {
          onChange([]);
        }}
        onBlur={onBlur}
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
      {variant === "edit" ? (
        <Button
          onClick={() => {
            onChange(restoreSelection(props.initialMemberIds));
          }}
          onBlur={onBlur}
          size="sm"
          type="button"
          variant="outline"
        >
          <Copy className="size-4" />
          <span>Przywróć</span>
        </Button>
      ) : (
        <Button
          disabled={props.lastBet._tag === "unavailable"}
          onClick={() => {
            onChange(copyLastBet(props.lastBet));
          }}
          onBlur={onBlur}
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
  );
};

interface AvailableUsersProps {
  readonly fieldName?: string;
  readonly idPrefix: string;
  readonly onBlur?: () => void;
  readonly onChange: (userIds: string[]) => void;
  readonly selectedUserIds: string[];
  readonly users: SelectableUser[];
  readonly variant: HeroBetMemberPickerProps["variant"];
}

const AvailableUsers = ({
  fieldName,
  idPrefix,
  onBlur,
  onChange,
  selectedUserIds,
  users,
  variant,
}: AvailableUsersProps) => {
  if (variant === "add") {
    return (
      <UserSelectList
        {...(fieldName === undefined ? {} : { fieldName })}
        idPrefix={idPrefix}
        {...(onBlur === undefined ? {} : { onBlur })}
        onToggleUser={(userId) => {
          onChange(toggleUser(userId, selectedUserIds));
        }}
        selectedUserIds={selectedUserIds}
        users={users}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {users.map((user) => (
        <label
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
          htmlFor={`${idPrefix}-${user.id}`}
          key={user.id}
        >
          <Checkbox
            id={`${idPrefix}-${user.id}`}
            {...(fieldName === undefined ? {} : { name: fieldName })}
            onBlur={onBlur}
            onCheckedChange={() => {
              onChange(toggleUser(user.id, selectedUserIds));
            }}
          />
          <Avatar className="size-8">
            <AvatarImage alt={user.name} src={user.image ?? undefined} />
            <AvatarFallback>
              <User className="size-4" />
            </AvatarFallback>
          </Avatar>
          <span className="truncate font-normal">{user.name}</span>
        </label>
      ))}
    </div>
  );
};

interface SelectedUsersProps {
  readonly fieldName?: string;
  readonly idPrefix: string;
  readonly onBlur?: () => void;
  readonly onChange: (userIds: string[]) => void;
  readonly selectedUserIds: string[];
  readonly selectedUsers: SelectableUser[];
  readonly variant: HeroBetMemberPickerProps["variant"];
}

const SelectedUsers = ({
  selectedUserIds,
  selectedUsers,
  fieldName,
  onBlur,
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
                    {...(fieldName === undefined ? {} : { name: fieldName })}
                    onBlur={onBlur}
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
              aria-label={`Usuń gracza ${user.name}`}
              className="flex size-5 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => {
                onChange(removeUser(user.id, selectedUserIds));
              }}
              onBlur={onBlur}
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

interface PointsPreviewProps {
  readonly preview: ReturnType<typeof getPointsPreview> | undefined;
}

const PointsPreview = ({ preview }: PointsPreviewProps): ReactNode => {
  if (preview === undefined) {
    return null;
  }

  return (
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
          <p className="font-semibold text-lg">{preview.newMemberCount} os.</p>
          <Badge variant={preview.variant}>
            {preview.newPointsPerMember} pkt/os
          </Badge>
        </div>
      </div>
    </div>
  );
};

/** Renders add or edit member selection without allowing controls from the other flow. */
export const HeroBetMemberPicker = (props: HeroBetMemberPickerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const idPrefix = props.idPrefix ?? "user";
  const selectedUserIdSet = HashSet.fromIterable(props.selectedUserIds);
  const availableUsers = getAvailableUsers(
    props.users,
    props.selectedUserIds,
    searchQuery
  );
  const selectedUsers = getSelectedUsers(props.users, props.selectedUserIds);
  const availableCount =
    props.users?.filter((user) => !HashSet.has(selectedUserIdSet, user.id))
      .length ?? 0;
  const listState = getAvailableListState({
    availableUsers,
    users: props.users,
    usersLoading: props.usersLoading,
  });
  const preview =
    props.variant === "edit"
      ? getPointsPreview(
          props.selectedUserIds.length,
          props.pointsPreview.currentMemberCount
        )
      : undefined;

  return (
    <div className="grid gap-1.5">
      <PointsPreview preview={preview} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Label>Gracze ({availableCount} dostępnych)</Label>
        {props.variant === "add" ? (
          <SelectionActions
            {...(props.onBlur === undefined ? {} : { onBlur: props.onBlur })}
            lastBet={props.lastBet}
            onChange={props.onChange}
            selectedUserIds={props.selectedUserIds}
            variant="add"
          />
        ) : (
          <SelectionActions
            {...(props.onBlur === undefined ? {} : { onBlur: props.onBlur })}
            initialMemberIds={props.initialMemberIds}
            onChange={props.onChange}
            selectedUserIds={props.selectedUserIds}
            variant="edit"
          />
        )}
      </div>

      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
        <Input
          aria-label="Szukaj gracza"
          className="pl-9"
          onChange={(event) => {
            setSearchQuery(event.target.value);
          }}
          {...(props.onBlur === undefined ? {} : { onBlur: props.onBlur })}
          placeholder="Szukaj gracza..."
          type="text"
          value={searchQuery}
        />
      </div>

      <div
        className={
          props.variant === "edit"
            ? "max-h-48 overflow-y-auto rounded-md border p-4"
            : "max-h-64 overflow-y-auto rounded-md border p-4"
        }
      >
        {props.variant === "edit" && (
          <p className="mb-2 text-muted-foreground text-sm">Dostępni gracze:</p>
        )}
        {listState === "has-users" ? (
          <AvailableUsers
            {...(props.fieldName === undefined
              ? {}
              : { fieldName: props.fieldName })}
            idPrefix={idPrefix}
            {...(props.onBlur === undefined ? {} : { onBlur: props.onBlur })}
            onChange={props.onChange}
            selectedUserIds={props.selectedUserIds}
            users={availableUsers}
            variant={props.variant}
          />
        ) : (
          <AvailableListEmptyState state={listState} />
        )}
      </div>

      {props.selectedUserIds.length > 0 && (
        <SelectedUsers
          {...(props.fieldName === undefined
            ? {}
            : { fieldName: props.fieldName })}
          idPrefix={idPrefix}
          {...(props.onBlur === undefined ? {} : { onBlur: props.onBlur })}
          onChange={props.onChange}
          selectedUserIds={props.selectedUserIds}
          selectedUsers={selectedUsers}
          variant={props.variant}
        />
      )}
    </div>
  );
};
