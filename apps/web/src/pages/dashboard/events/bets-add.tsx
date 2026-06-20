import { useForm } from "@tanstack/react-form";
import type { ReactFormExtendedApi } from "@tanstack/react-form";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { HeroBetMemberPicker } from "@/components/events/hero-bet-member-picker";
import { HeroCardsGrid } from "@/components/events/hero-cards-grid";
import type { HeroCardOption } from "@/components/events/hero-cards-grid";
import type { SelectableUser } from "@/components/events/user-select-list";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface HeroSelectionProps {
  heroes: (HeroCardOption & { eventId: number })[] | undefined;
  heroesLoading: boolean;
  selectedEventId: string;
  fieldValue: string;
  onChange: (heroId: string) => void;
}

const HeroSelection = ({
  heroes,
  heroesLoading,
  selectedEventId,
  fieldValue,
  onChange,
}: HeroSelectionProps) => {
  if (heroesLoading) {
    return <p className="text-muted-foreground text-sm">Ładowanie...</p>;
  }
  if (!selectedEventId) {
    return (
      <p className="text-muted-foreground text-sm">Najpierw wybierz event</p>
    );
  }
  const filteredHeroes = heroes?.filter(
    (hero) => hero.eventId === Number.parseInt(selectedEventId || "0", 10)
  );
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

// Generic TanStack Form API used to pass the form across components
// without re-typing all 12+ validator generics. The actual data
// shape is preserved through inference at the call site.
type AnyFormForBets = ReactFormExtendedApi<
  AddBetForm,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>;

interface BetsAddFormProps {
  form: AnyFormForBets;
  events:
    | {
        color: string;
        endTime: Date;
        icon: string;
        id: number;
        name: string;
      }[]
    | undefined;
  eventsLoading: boolean;
  heroes: (HeroCardOption & { eventId: number })[] | undefined;
  heroesLoading: boolean;
  verifiedUsers: SelectableUser[] | undefined;
  usersLoading: boolean;
  allBets: { members: { userId: string }[] }[] | undefined;
  betsLoading: boolean;
  selectedEventId: string;
  setSelectedEventId: (id: string) => void;
}

const BetsAddForm = ({
  form,
  events,
  eventsLoading,
  heroes,
  heroesLoading,
  verifiedUsers,
  usersLoading,
  allBets,
  betsLoading,
  selectedEventId,
  setSelectedEventId,
}: BetsAddFormProps) => {
  const lastBet = allBets?.[0];

  return (
    <form
      className="space-y-6"
      action={async () => {
        await form.handleSubmit();
      }}
    >
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
              </div>
            );
          }}
        </form.Field>

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button
              className="h-10"
              disabled={
                !canSubmit ||
                isSubmitting ||
                eventsLoading ||
                heroesLoading ||
                usersLoading
              }
              type="submit"
            >
              {isSubmitting ? (
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
            <HeroSelection
              fieldValue={field.state.value}
              heroes={heroes}
              heroesLoading={heroesLoading}
              onChange={field.handleChange}
              selectedEventId={selectedEventId}
            />
            {field.state.meta.errors.map((error) => (
              <p className="text-destructive text-sm" key={error?.message}>
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
            <HeroBetMemberPicker
              clearEnabled
              copyLastBetEnabled
              lastBet={lastBet}
              lastBetAvailable={!betsLoading && !!allBets && allBets.length > 0}
              onChange={field.handleChange}
              selectedUserIds={field.state.value}
              users={verifiedUsers}
              usersLoading={usersLoading}
              variant="add"
            />
            {field.state.meta.errors.map((error) => (
              <p className="text-destructive text-sm" key={error?.message}>
                {error?.message}
              </p>
            ))}
          </div>
        )}
      </form.Field>
    </form>
  );
};

const defaultValues: AddBetForm = {
  eventId: "",
  heroId: "",
  userIds: [],
};

interface BetsAddPageProps {
  session: AuthSession;
}

export const BetsAddPage = ({ session }: BetsAddPageProps) => {
  const [selectedEventId, setSelectedEventId] = useState("");
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
        description: "Submit the bet creation form",
        name: "Create Bet",
      },
    }
  );

  // Filter heroes by selected event happens inside HeroSelection

  if (!isAdminUser) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
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
        <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
          Dodaj obstawienie
        </h1>
        <p className="text-muted-foreground text-sm">
          Wybierz event, herosa i graczy.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        {" "}
        <BetsAddForm
          allBets={allBets}
          betsLoading={betsLoading}
          events={events}
          eventsLoading={eventsLoading}
          form={form}
          heroes={heroes}
          heroesLoading={heroesLoading}
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          usersLoading={usersLoading}
          verifiedUsers={verifiedUsers}
        />{" "}
      </div>
    </div>
  );
};
