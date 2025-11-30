import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Cake,
  Calendar,
  Egg,
  Ghost,
  Search,
  Snowflake,
  Sun,
  Sword,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isAdmin } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const EVENT_ICON_MAP = {
  egg: Egg,
  sun: Sun,
  ghost: Ghost,
  cake: Cake,
  snowflake: Snowflake,
  calendar: Calendar,
} as const;

export const Route = createFileRoute("/dashboard/events/bets/add")({
  component: RouteComponent,
  staticData: {
    crumb: "Dodaj obstawienie",
  },
});

type AddBetForm = {
  eventId: string;
  heroId: string;
  userIds: string[];
};

const defaultValues: AddBetForm = {
  eventId: "",
  heroId: "",
  userIds: [],
};

const POINTS_PER_HERO = 20;

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
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
        queryClient.invalidateQueries({
          queryKey: orpc.bet.getAll.queryKey(),
        });
        // Only reset players, keep event and hero selected
        setSelectedUserIds([]);
        form.setFieldValue("userIds", []);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Nie udało się utworzyć obstawienia";
        toast.error(message);
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

  // Filter heroes by selected event
  const filteredHeroes = heroes?.filter(
    (hero) => hero.eventId === Number.parseInt(selectedEventId || "0", 10)
  );

  // Calculate points preview
  const pointsPerMember =
    selectedUserIds.length > 0
      ? Math.floor((POINTS_PER_HERO / selectedUserIds.length) * 100) / 100
      : "0.00";

  const handleUserToggle = (userId: string, currentUserIds: string[]) => {
    if (currentUserIds.includes(userId)) {
      return currentUserIds.filter((id) => id !== userId);
    }
    return [...currentUserIds, userId];
  };

  const handleSelectAllUsers = (currentUserIds: string[]) => {
    if (!verifiedUsers) {
      return currentUserIds;
    }
    if (currentUserIds.length === verifiedUsers.length) {
      return [];
    }
    return verifiedUsers.map((user) => user.id);
  };

  const renderHeroCards = (
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filteredHeroes?.map((hero) => (
          <button
            className={`group relative flex flex-col items-center rounded-lg border p-3 transition-all hover:bg-muted/50 ${
              fieldValue === hero.id.toString()
                ? "border-primary bg-primary/5 ring-2 ring-primary"
                : "border-border"
            }`}
            key={hero.id}
            onClick={() => onChange(hero.id.toString())}
            type="button"
          >
            {hero.image ? (
              <img
                alt={hero.name}
                className="mb-2 h-16 w-14 rounded object-contain"
                height={64}
                src={hero.image}
                width={56}
              />
            ) : (
              <div className="mb-2 flex h-16 w-14 items-center justify-center rounded bg-muted">
                <Sword className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <span className="line-clamp-2 text-center font-medium text-xs">
              {hero.name}
            </span>
            <span className="text-muted-foreground text-sm">
              Lvl {hero.level}
            </span>
            {fieldValue === hero.id.toString() && (
              <div className="-top-1 -right-1 absolute flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                ✓
              </div>
            )}
          </button>
        ))}
      </div>
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

    // Filter users by search query
    const filteredUsers = verifiedUsers?.filter((user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filteredUsers?.length === 0) {
      return (
        <p className="text-muted-foreground text-sm">
          Nie znaleziono graczy pasujących do wyszukiwania
        </p>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {filteredUsers?.map((user) => (
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
              fieldValue.includes(user.id)
                ? "border-primary bg-primary/5"
                : "border-border"
            }`}
            htmlFor={`user-${user.id}`}
            key={user.id}
          >
            <Checkbox
              checked={fieldValue.includes(user.id)}
              id={`user-${user.id}`}
              onCheckedChange={() => {
                const newIds = handleUserToggle(user.id, fieldValue);
                onChange(newIds);
                setSelectedUserIds(newIds);
              }}
            />
            <Avatar className="h-8 w-8">
              <AvatarImage alt={user.name} src={user.image || undefined} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <span className="truncate font-normal">{user.name}</span>
          </label>
        ))}
      </div>
    );
  };

  if (isAdminUser) {
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
      <div>
        <h1 className="mb-1 font-bold text-2xl tracking-tight">
          Dodaj obstawienie
        </h1>
        <p className="text-muted-foreground text-sm">
          Utwórz nowe obstawienie na wybranego herosa z wybranymi graczami.
        </p>
      </div>

      <Card>
        <CardContent>
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            {/* Event Selection */}
            <form.Field name="eventId">
              {(field) => {
                const selectedEvent = events?.find(
                  (e) => e.id.toString() === field.state.value
                );
                const SelectedIcon = selectedEvent
                  ? EVENT_ICON_MAP[
                      selectedEvent.icon as keyof typeof EVENT_ICON_MAP
                    ] || Calendar
                  : null;

                return (
                  <div className="grid gap-1.5">
                    <Label htmlFor={field.name}>Event</Label>
                    <Select
                      onValueChange={(value) => {
                        field.handleChange(value);
                        setSelectedEventId(value);
                        form.setFieldValue("heroId", "");
                      }}
                      value={field.state.value}
                    >
                      <SelectTrigger id={field.name}>
                        <SelectValue placeholder="Wybierz event">
                          {selectedEvent && SelectedIcon && (
                            <span className="flex items-center gap-2">
                              <SelectedIcon
                                className="h-4 w-4"
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
                            const IconComponent =
                              EVENT_ICON_MAP[
                                event.icon as keyof typeof EVENT_ICON_MAP
                              ] || Calendar;
                            return (
                              <SelectItem
                                key={event.id}
                                value={event.id.toString()}
                              >
                                <span className="flex items-center gap-2">
                                  <IconComponent
                                    className="h-4 w-4"
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
                      <p className="text-red-500 text-sm" key={error?.message}>
                        {error?.message}
                      </p>
                    ))}
                  </div>
                );
              }}
            </form.Field>

            {/* Hero Selection - Cards with Images */}
            <form.Field name="heroId">
              {(field) => (
                <div className="grid gap-1.5">
                  <Label>Heros</Label>
                  {renderHeroCards(field.state.value, field.handleChange)}
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
              {(field) => (
                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Gracze ({field.state.value.length} wybranych)</Label>
                    <Button
                      onClick={() => {
                        const newIds = handleSelectAllUsers(field.state.value);
                        field.handleChange(newIds);
                        setSelectedUserIds(newIds);
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {field.state.value.length === verifiedUsers?.length
                        ? "Odznacz wszystkich"
                        : "Zaznacz wszystkich"}
                    </Button>
                  </div>
                  <div className="relative">
                    <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Szukaj gracza..."
                      type="text"
                      value={searchQuery}
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-md border p-4">
                    {renderUserList(field.state.value, field.handleChange)}
                  </div>
                  {field.state.meta.errors.map((error) => (
                    <p className="text-red-500 text-sm" key={error?.message}>
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            {/* Points Preview */}
            {selectedUserIds.length > 0 && (
              <div className="rounded-md border bg-muted/50 p-4">
                <p className="font-medium text-sm">Podgląd punktów</p>
                <p className="text-muted-foreground text-sm">
                  {POINTS_PER_HERO} punktów ÷ {selectedUserIds.length} graczy ={" "}
                  <span className="font-semibold text-foreground">
                    {pointsPerMember} punktów
                  </span>{" "}
                  na gracza
                </p>
              </div>
            )}

            {/* Submit Button */}
            <form.Subscribe>
              {(state) => (
                <Button
                  className="w-full sm:w-auto"
                  disabled={
                    !state.canSubmit ||
                    state.isSubmitting ||
                    eventsLoading ||
                    heroesLoading ||
                    usersLoading
                  }
                  type="submit"
                >
                  {state.isSubmitting ? "Tworzenie..." : "Utwórz obstawienie"}
                </Button>
              )}
            </form.Subscribe>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
