import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { POINTS_PER_HERO } from "@tepirek-revamped/config";
import { Copy, CopyX, Pencil, Search, User, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { orpc } from "@/utils/orpc";

interface EditBetModalProps {
  betId: number;
  currentMembers: {
    userId: string;
    userName: string;
    userImage: string | null;
  }[];
  heroName: string;
  memberCount: number;
  trigger?: React.ReactNode;
}

const schema = z.object({
  userIds: z.array(z.string()).min(1, "Wybierz przynajmniej jednego gracza"),
});

const handleUserToggle = (userId: string, currentUserIds: string[]) => {
  if (currentUserIds.includes(userId)) {
    return currentUserIds.filter((id) => id !== userId);
  }
  return [...currentUserIds, userId];
};

export const EditBetModal = ({
  betId,
  currentMembers,
  heroName,
  memberCount,
  trigger,
}: EditBetModalProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const currentMemberIds = currentMembers.map((m) => m.userId);

  const { data: verifiedUsers, isPending: usersLoading } = useQuery(
    orpc.user.getVerified.queryOptions()
  );

  const editMutation = useMutation({
    mutationFn: async (newUserIds: string[]) => {
      await orpc.bet.edit.call({ betId, newUserIds });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Wystąpił błąd";
      toast.error(message);
    },
    onSuccess: async () => {
      toast.success("Obstawienie zostało zaktualizowane");
      await queryClient.invalidateQueries({
        queryKey: ["bets", "paginated"],
      });
      setOpen(false);
      setSearchQuery("");
    },
  });

  const form = useForm({
    defaultValues: {
      userIds: currentMemberIds,
    },
    onSubmit: async ({ value }) => {
      await editMutation.mutateAsync(value.userIds);
    },
    validators: {
      onSubmit: schema,
    },
  });

  const calculatePointsPerMember = (count: number) =>
    Math.floor((POINTS_PER_HERO / count) * 100) / 100;

  const renderUserList = (
    fieldValue: string[],
    onChange: (userIds: string[]) => void
  ) => {
    if (usersLoading) {
      return <p className="text-muted-foreground text-sm">Ładowanie...</p>;
    }
    if (verifiedUsers?.length === 0) {
      return (
        <p className="text-muted-foreground text-sm">
          Brak zweryfikowanych graczy
        </p>
      );
    }

    // Filter users by search query and exclude selected users
    const filteredUsers = verifiedUsers?.filter(
      (user) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !fieldValue.includes(user.id)
    );

    if (filteredUsers?.length === 0) {
      return (
        <p className="text-muted-foreground text-sm">
          Nie znaleziono graczy pasujących do wyszukiwania
        </p>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-2">
        {filteredUsers?.map((user) => (
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
              fieldValue.includes(user.id)
                ? "border-primary bg-primary/5"
                : "border-border"
            }`}
            htmlFor={`edit-user-${user.id}`}
            key={user.id}
          >
            <Checkbox
              checked={fieldValue.includes(user.id)}
              id={`edit-user-${user.id}`}
              onCheckedChange={() => {
                const newIds = handleUserToggle(user.id, fieldValue);
                onChange(newIds);
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

  const handleCopyCurrent = () => currentMemberIds;

  return (
    <ResponsiveDialog onOpenChange={setOpen} open={open}>
      <ResponsiveDialogTrigger asChild>
        {trigger ?? (
          <Button size="icon" type="button" variant="ghost">
            <Pencil className="size-4" />
          </Button>
        )}
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-[600px]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Edytuj obstawienie</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Modyfikuj listę graczy obstawiających herosa &quot;{heroName}
              &quot;.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <form.Field name="userIds">
            {(field) => {
              const newMemberCount = field.state.value.length;
              const newPointsPerMember =
                calculatePointsPerMember(newMemberCount);
              const currentPointsPerMember =
                calculatePointsPerMember(memberCount);

              return (
                <div className="grid gap-4 py-4">
                  {/* Stats preview */}
                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Obecnie</p>
                        <p className="font-semibold text-lg">
                          {memberCount} os.
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {currentPointsPerMember} pkt/os
                        </p>
                      </div>
                      <div className="text-muted-foreground">→</div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">
                          Po zmianie
                        </p>
                        <p className="font-semibold text-lg">
                          {newMemberCount} os.
                        </p>
                        {(() => {
                          let variant: "default" | "destructive" | "secondary" =
                            "secondary";
                          if (newPointsPerMember > currentPointsPerMember) {
                            variant = "default";
                          } else if (
                            newPointsPerMember < currentPointsPerMember
                          ) {
                            variant = "destructive";
                          }
                          return (
                            <Badge variant={variant}>
                              {newPointsPerMember} pkt/os
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Search and controls */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Gracze</Label>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            field.handleChange([]);
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <CopyX className="mr-1 size-4" />
                          Wyczyść
                        </Button>
                        <Button
                          onClick={() => {
                            const newIds = handleCopyCurrent();
                            field.handleChange(newIds);
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Copy className="mr-1 size-4" />
                          Przywróć
                        </Button>
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
                  </div>

                  {/* Available users list */}
                  <div className="max-h-48 overflow-y-auto rounded-md border p-4">
                    <p className="mb-2 text-muted-foreground text-sm">
                      Dostępni gracze:
                    </p>
                    {renderUserList(field.state.value, field.handleChange)}
                  </div>

                  {/* Selected users */}
                  {field.state.value.length > 0 && (
                    <div>
                      <Label className="mb-2">
                        Wybrani gracze ({field.state.value.length}):
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {verifiedUsers
                          ?.filter((user) =>
                            field.state.value.includes(user.id)
                          )
                          .map((user) => (
                            <div
                              className="flex items-center gap-2 rounded-full border bg-muted/30 py-1 pr-3 pl-1"
                              key={user.id}
                            >
                              <Avatar className="size-6">
                                <AvatarImage
                                  alt={user.name}
                                  src={user.image ?? undefined}
                                />
                                <AvatarFallback className="text-xs">
                                  <User className="size-3" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{user.name}</span>
                              <button
                                className="flex size-5 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => {
                                  const newIds = field.state.value.filter(
                                    (id) => id !== user.id
                                  );
                                  field.handleChange(newIds);
                                }}
                                type="button"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {field.state.meta.errors.map((error) => (
                    <p className="text-red-500 text-sm" key={error?.message}>
                      {error?.message}
                    </p>
                  ))}
                </div>
              );
            }}
          </form.Field>

          <ResponsiveDialogFooter>
            <form.Subscribe>
              {(state) => (
                <Button
                  disabled={
                    !state.canSubmit ||
                    state.isSubmitting ||
                    usersLoading ||
                    editMutation.isPending
                  }
                  type="submit"
                >
                  {editMutation.isPending ? "Zapisywanie..." : "Zapisz zmiany"}
                </Button>
              )}
            </form.Subscribe>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
