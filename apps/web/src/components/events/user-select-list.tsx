import { User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";

export interface SelectableUser {
  id: string;
  image: string | null;
  name: string;
}

interface UserSelectListProps {
  users: SelectableUser[];
  selectedUserIds: string[];
  onToggleUser: (userId: string) => void;
}

export const UserSelectList = ({
  users,
  selectedUserIds,
  onToggleUser,
}: UserSelectListProps) => (
  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
    {users.map((user) => (
      <label
        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
          selectedUserIds.includes(user.id)
            ? "border-primary bg-primary/5"
            : "border-border"
        }`}
        htmlFor={`user-${user.id}`}
        key={user.id}
      >
        <Checkbox
          checked={selectedUserIds.includes(user.id)}
          id={`user-${user.id}`}
          onCheckedChange={() => {
            onToggleUser(user.id);
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
