import { useForm } from "@tanstack/react-form";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, CopyX, Loader2, Search, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { HeroCardsGrid } from "@/components/events/hero-cards-grid";
import { UserSelectList } from "@/components/events/user-select-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { handleUserToggle } from "@/lib/bet-helpers";
import { getEventIcon } from "@/lib/constants";
import { getErrorMessage } from "@/lib/errors";
import { isAdmin } from "@/lib/route-helpers";
import type { AuthSession } from "@/types/route";
import { orpc } from "@/utils/orpc";

interface AddBetForm {
  eventId: string;
  heroId: string;
  userIds: string[];
}

const defaultValues: AddBetForm = {
  eventId: "",
  heroId: "",
  userIds: [],
};

interface BetsAddPageProps {
  session: AuthSession;
}

export function BetsAddPage({ session }: BetsAddPageProps) {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: events, isPending: eventsLoading } = useQuery(
    orpc.event.getAll.queryOptions()
  );

  const { data: heroes, isPending: heroesLoading } = useQuery(
    orpc.heroes.getAll.queryOptions()
  );

  const { data: verifiedUsers, isPending: usersLoading } = useQuery(
    orpc.user.getVerified.queryOptions()
  );

  const { data: allBets, isPending: betsLoading } = useQuery(
    orpc.bet.getAll.queryOptions()
  );

  const isAdminUser = isAdmin(session);

  const form = useForm({
    defaultValues: {
      ...defaultValues,
    },
    onSubmit: async ({ value }) => {
      try {
        if (!value.eventId) {
          toast.error("Wybierz event!");
          return;
        }
        if (!value.heroId) {
          toast.error("Wybierz herosa!");
          return;
        }
        if (value.userIds.length === 0) {
          toast.error("Wybierz przynajmniej jednego gracza!");
          return;
        }

        await orpc.bet.create.call({
          heroId: Number.parseInt(value.heroId, 10),
          userIds: value.userIds,
        });

        toast.success("Obstawienie dodano pomyślnie");
        await queryClient.invalidateQueries({
          queryKey: orpc.bet.getAll.queryKey(),
        });
        form.setFieldValue("userIds", []);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    validators: {
      onSubmit: z.object({
        eventId: z.string().min(1, "Wybierz event"),
        heroId: z.string().min(1, "Wybierz herosa"),
        userIds: z
          .array(z.string())
          .min(1, "Wybierz przynajmniej jednego gracza"),
      }),
    },
  });

  useHotkey(
    "Enter",
    async () => {
      await form.handleSubmit();
    },
    {
      meta: {
        name: "Create Bet",
        description: "Submit the bet creation form",
      },
    }
  );

  // Filter heroes by selected event
  const filteredHeroes = heroes?.filter(
    (hero) => hero.eventId === Number.parseInt(selectedEventId || "0", 10)
  );

  const handleCopyLastBet = () => {
    if (!allBets || allBets.length === 0) {
      return [];
    }
    const [lastBet] = allBets;
    return lastBet.members.map((member) => member.userId);
  };

  const renderHeroSelection = (
    fieldValue: string,
    onChange: (heroId: string) => void
  ) => {
    if (heroesLoading) {
      return <p className="text-muted-foreground text-sm">Ładowanie...</p>;
    }
    if (!selectedEventId) {
      return (
        <p className="text-muted-foreground text-sm">Najpierw wybierz event</p>
      );
    }
    if (filteredHeroes?.length === 0) {
      return (
        <p className="text-muted-foreground text-sm">
          Brak herosów w tym evencie
        </p>
      );
    }

    return (
      <HeroCardsGrid
        heroes={filteredHeroes ?? []}
        onSelectHero={onChange}
        selectedHeroId={fieldValue}
      />
    );
  };

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

    if (!filteredUsers || filteredUsers.length === 0) {
      return (
        <p className="text-muted-foreground text-sm">
          Nie znaleziono graczy pasujących do wyszukiwania
        </p>
      );
    }

    return (
      <UserSelectList
        onToggleUser={(userId) => {
          const newIds = handleUserToggle(userId, fieldValue);
          onChange(newIds);
        }}
        selectedUserIds={fieldValue}
        users={filteredUsers ?? []}
      />
    );
  };

  if (!isAdminUser) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="mb-1 font-bold text-2xl tracking-tight">
            Dodaj obstawienie
          </h1>
          <p className="text-muted-foreground text-sm">
            Tylko administratorzy mogą dodawać obstawienia.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Card>
        <CardContent>
          <form
            className="space-y-6"
            onSubmit={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              await form.handleSubmit();
            }}
          >
            {" "}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              {/* Event Selection */}
              <form.Field name="eventId">
                {(field) => {
                  const selectedEvent = events?.find(
                    (e) => e.id.toString() === field.state.value
                  );
                  const SelectedIcon = selectedEvent
                    ? getEventIcon(selectedEvent.icon)
                    : null;

                  return (
                    <div className="grid gap-1.5">
                      <Label htmlFor={field.name}>Event</Label>
                      <Select
                        onValueChange={(value) => {
                          if (value !== null) {
                            field.handleChange(value);
                            setSelectedEventId(value);
                          }
                          form.setFieldValue("heroId", "");
                        }}
                        value={field.state.value}
                      >
                        <SelectTrigger id={field.name}>
                          <SelectValue placeholder="Wybierz event">
                            {selectedEvent && SelectedIcon && (
                              <span className="flex items-center gap-2">
                                <SelectedIcon
                                  className="size-4"
                                  style={{ color: selectedEvent.color }}
                                />
                                {selectedEvent.name}
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {eventsLoading ? (
                            <SelectItem disabled value="loading">
                              Ładowanie...
                            </SelectItem>
                          ) : (
                            events?.map((event) => {
                              const IconComponent = getEventIcon(event.icon);
                              return (
                                <SelectItem
                                  key={event.id}
                                  value={event.id.toString()}
                                >
                                  <span className="flex items-center gap-2">
                                    <IconComponent
                                      className="size-4"
                                      style={{ color: event.color }}
                                    />
                                    {event.name}
                                  </span>
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                      {field.state.meta.errors.map((error) => (
                        <p
                          className="text-red-500 text-sm"
                          key={error?.message}
                        >
                          {error?.message}
                        </p>
                      ))}
                    </div>
                  );
                }}
              </form.Field>

              {/* Submit Button */}
              <form.Subscribe>
                {(state) => (
                  <Button
                    className="w-full sm:w-auto hover:bg-primary/80"
                    disabled={
                      !state.canSubmit ||
                      state.isSubmitting ||
                      eventsLoading ||
                      heroesLoading ||
                      usersLoading
                    }
                    type="submit"
                  >
                    {state.isSubmitting ? (
                      <p className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Tworzenie obstawienia
                      </p>
                    ) : (
                      <p className="flex items-center gap-2">
                        Utwórz obstawienie
                        <Kbd>Enter</Kbd>
                      </p>
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </div>
            {/* Hero Selection - Cards with Images */}
            <form.Field name="heroId">
              {(field) => (
                <div className="grid gap-1.5">
                  <Label>Heros</Label>
                  {renderHeroSelection(field.state.value, field.handleChange)}
                  {field.state.meta.errors.map((error) => (
                    <p className="text-red-500 text-sm" key={error?.message}>
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>
            {/* User Selection */}
            <form.Field name="userIds">
              {(field) => {
                const availableCount =
                  verifiedUsers?.filter(
                    (user) => !field.state.value.includes(user.id)
                  ).length ?? 0;

                return (
                  <div className="grid gap-1.5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Label>Gracze ({availableCount} dostępnych)</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={field.state.value.length === 0}
                          onClick={() => {
                            field.handleChange([]);
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <CopyX className="size-4" />
                          <span className="hidden sm:inline">
                            Odznacz wszystkich
                          </span>
                          <span className="sm:hidden">Odznacz</span>
                        </Button>
                        <Button
                          disabled={
                            !allBets || allBets.length === 0 || betsLoading
                          }
                          onClick={() => {
                            const newIds = handleCopyLastBet();
                            field.handleChange(newIds);
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Copy className="size-4" />
                          <span className="hidden sm:inline">
                            Kopiuj ostatnie
                          </span>
                          <span className="sm:hidden">Kopiuj</span>
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
                    <div className="max-h-64 overflow-y-auto rounded-md border p-4">
                      {renderUserList(field.state.value, field.handleChange)}
                    </div>

                    {/* Selected Users Card */}
                    {field.state.value.length > 0 && (
                      <div>
                        <Label className="mb-2">
                          Gracze ({field.state.value.length} wybranych)
                        </Label>
                        <div className="rounded-md border border-muted bg-muted/30">
                          <div className="p-4">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
                              {verifiedUsers
                                ?.filter((user) =>
                                  field.state.value.includes(user.id)
                                )
                                .map((user) => (
                                  <label
                                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-primary bg-primary/5 p-3 transition-colors hover:bg-muted/50"
                                    htmlFor={`selected-user-${user.id}`}
                                    key={user.id}
                                  >
                                    <Checkbox
                                      checked={true}
                                      id={`selected-user-${user.id}`}
                                      onCheckedChange={() => {
                                        const newIds = field.state.value.filter(
                                          (id) => id !== user.id
                                        );
                                        field.handleChange(newIds);
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
                                    <span className="truncate font-normal">
                                      {user.name}
                                    </span>
                                  </label>
                                ))}
                            </div>
                          </div>
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
