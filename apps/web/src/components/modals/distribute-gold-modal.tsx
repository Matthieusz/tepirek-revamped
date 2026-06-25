import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
  getEventSelectDisplay,
  getHeroSelectDisplay,
} from "@/components/events/select-display";
import {
  EventSelectItems,
  HeroSelectItems,
} from "@/components/events/select-utils";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/errors";
import { ALL_FILTER } from "@/lib/event-hero-filter";
import { parseGoldAmount } from "@/lib/gold";
import { invalidateBetLedgerQueries } from "@/lib/query-invalidation";
import { orpc } from "@/utils/orpc";

interface HeroStats {
  heroId: number;
  heroName: string;
  currentPointWorth: number;
  totalBets: number;
  totalPoints: number;
}

const getModalEventSelectDisplay = (params: {
  selectedEventId: string;
  events:
    | {
        color: string | null;
        endTime: Date;
        icon: string;
        id: number;
        name: string;
      }[]
    | undefined;
}): ReactNode =>
  getEventSelectDisplay({
    events: params.events,
    selectedEventId: params.selectedEventId,
  });

const getModalHeroSelectDisplay = (params: {
  selectedEventId: string;
  selectedHeroId: string;
  heroes: { id: number; name: string }[] | undefined;
}): string =>
  getHeroSelectDisplay({
    allLabel: "Wybierz herosa...",
    placeholder: "Wybierz herosa...",
    selectedEventId: params.selectedEventId,
    selectedHeroId: params.selectedHeroId,
    sortedHeroes: params.heroes,
  });

const HeroStatsPreview = ({
  heroStats,
  isPending,
}: {
  heroStats: HeroStats | undefined;
  isPending: boolean;
}) => {
  if (isPending) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-muted-foreground text-sm">Ładowanie statystyk...</p>
      </div>
    );
  }

  if (!heroStats) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-muted-foreground text-sm">
          Brak danych dla tego herosa
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="space-y-2">
        <h4 className="font-semibold">{heroStats.heroName}</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Suma punktów</p>
            <p className="font-mono font-semibold">
              {heroStats.totalPoints.toFixed(2)}
            </p>
          </div>
          {heroStats.currentPointWorth > 0 && (
            <div>
              <p className="text-muted-foreground">Aktualna wartość punktu</p>
              <p className="font-mono font-semibold">
                {heroStats.currentPointWorth.toLocaleString("pl-PL")} złota
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface DistributeGoldModalProps {
  trigger: React.ReactNode;
  selectedEventId?: string;
  selectedHeroId?: string;
}

export const DistributeGoldModal = ({
  trigger,
  selectedEventId = "all",
  selectedHeroId = "all",
}: DistributeGoldModalProps) => {
  const [open, setOpen] = useState(false);
  const [eventIdOverride, setEventIdOverride] = useState<string>();
  const [heroIdOverride, setHeroIdOverride] = useState<string>();
  const queryClient = useQueryClient();
  const eventId = eventIdOverride ?? selectedEventId;
  const heroId = heroIdOverride ?? selectedHeroId;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setEventIdOverride(undefined);
      setHeroIdOverride(undefined);
    }

    setOpen(nextOpen);
  };

  const { data: events } = useQuery(orpc.event.getAll.queryOptions());

  const { data: heroes, isPending: heroesLoading } = useQuery(
    orpc.heroes.getAll.queryOptions()
  );

  const filteredHeroes = (
    eventId === ALL_FILTER
      ? []
      : heroes?.filter((h) => h.eventId?.toString() === eventId)
  )?.toSorted((a, b) => a.level - b.level);

  // Get hero stats when a specific hero is selected
  const { data: heroStats, isPending: heroStatsPending } = useQuery({
    ...orpc.ranking.getHeroStats.queryOptions({
      input: { heroId: Number.parseInt(heroId, 10) },
    }),
    enabled: heroId !== ALL_FILTER && open,
  });

  const form = useForm({
    defaultValues: {
      goldAmount: "",
    },
    onSubmit: async ({ value }) => {
      try {
        if (heroId === ALL_FILTER) {
          toast.error("Wybierz konkretnego herosa!");
          return;
        }

        const goldAmount = parseGoldAmount(value.goldAmount);
        if (goldAmount <= 0) {
          toast.error("Podaj prawidłową kwotę złota!");
          return;
        }

        const result = await orpc.vault.distributeGold.call({
          goldAmount,
          heroId: Number.parseInt(heroId, 10),
        });

        toast.success(
          `Rozdzielono ${goldAmount.toLocaleString("pl-PL")} złota dla ${result.usersUpdated} graczy`
        );
        await invalidateBetLedgerQueries(queryClient);
        setOpen(false);
        form.reset();
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    validators: {
      onSubmit: z.object({
        goldAmount: z.string().min(1, "Kwota złota jest wymagana"),
      }),
    },
  });

  const goldAmount = parseGoldAmount(form.getFieldValue("goldAmount") || "0");
  const pointWorth =
    heroStats && heroStats.totalPoints > 0
      ? goldAmount / heroStats.totalPoints
      : 0;

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="max-w-3 sm:max-w-125">
        <form
          // oxlint-disable-next-line @typescript-eslint/no-misused-promises
          action={async () => {
            await form.handleSubmit();
          }}
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <Coins className="size-5 text-yellow-500" />
              Rozdziel złoto
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Ustaw kwotę złota do rozdzielenia dla herosa. Złoto zostanie
              podzielone proporcjonalnie do punktów każdego gracza.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="grid gap-4 py-4">
            {/* Event Select */}
            <div className="grid gap-1.5">
              <Label>Event</Label>
              <Select
                onValueChange={(value) => {
                  setEventIdOverride(value ?? ALL_FILTER);
                  setHeroIdOverride(ALL_FILTER);
                }}
                value={eventId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {getModalEventSelectDisplay({
                      selectedEventId: eventId,
                      events,
                    })}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <EventSelectItems events={events} />
                </SelectContent>
              </Select>
            </div>

            {/* Hero Select */}
            <div className="grid gap-1.5">
              <Label>Heros</Label>
              <Select
                disabled={eventId === ALL_FILTER}
                onValueChange={(value) => {
                  setHeroIdOverride(value ?? ALL_FILTER);
                }}
                value={eventId === ALL_FILTER ? "" : heroId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {getModalHeroSelectDisplay({
                      selectedEventId: eventId,
                      selectedHeroId: heroId,
                      heroes: filteredHeroes,
                    })}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <HeroSelectItems
                    allLabel="Wybierz herosa..."
                    heroesLoading={heroesLoading}
                    sortedHeroes={filteredHeroes}
                  />
                </SelectContent>
              </Select>
            </div>

            {/* Hero Stats Preview */}
            {heroId !== ALL_FILTER && (
              <HeroStatsPreview
                heroStats={heroStats}
                isPending={heroStatsPending}
              />
            )}

            {/* Gold Amount Input */}
            <div className="grid gap-1.5">
              <form.Field name="goldAmount">
                {(field) => (
                  <>
                    <Label htmlFor={field.name}>Kwota złota</Label>
                    <Input
                      disabled={heroId === ALL_FILTER}
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                      }}
                      placeholder="np. 2g lub 50000000"
                      type="text"
                      value={field.state.value}
                    />
                    <p className="text-muted-foreground text-xs">
                      Użyj &quot;g&quot; dla miliardów (np. 2g = 2 000 000 000)
                    </p>
                    {goldAmount > 0 && (
                      <p className="font-mono text-muted-foreground text-xs">
                        = {goldAmount.toLocaleString("pl-PL")} złota
                      </p>
                    )}
                    {field.state.meta.errors.map((error) => (
                      <p className="text-red-500 text-sm" key={error?.message}>
                        {error?.message}
                      </p>
                    ))}
                  </>
                )}
              </form.Field>
            </div>

            {/* Point Worth Preview */}
            {heroId !== ALL_FILTER &&
              goldAmount > 0 &&
              heroStats &&
              heroStats.totalPoints > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <h4 className="mb-2 font-semibold text-primary text-sm">
                    Podgląd rozdziału
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">
                        Wartość jednego punktu
                      </p>
                      <p className="font-mono font-semibold">
                        {pointWorth.toLocaleString("pl-PL", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        złota
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        Złoto do rozdzielenia
                      </p>
                      <p className="font-mono font-semibold">
                        {goldAmount.toLocaleString("pl-PL")}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-muted-foreground text-xs">
                    Formuła: złoto gracza = punkty gracza ×{" "}
                    {pointWorth.toFixed(2)}
                  </p>
                </div>
              )}
          </div>
          <ResponsiveDialogFooter>
            <Button
              onClick={() => {
                setOpen(false);
              }}
              type="button"
              variant="outline"
            >
              Anuluj
            </Button>
            <form.Subscribe>
              {(state) => (
                <Button
                  disabled={
                    !state.canSubmit ||
                    state.isSubmitting ||
                    heroId === ALL_FILTER ||
                    !heroStats ||
                    heroStats.totalPoints <= 0
                  }
                  type="submit"
                >
                  {state.isSubmitting ? "Rozdzielanie..." : "Rozdziel złoto"}
                </Button>
              )}
            </form.Subscribe>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
