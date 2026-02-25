import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getEventIcon } from "@/lib/constants";
import { orpc } from "@/utils/orpc";

interface HeroStats {
  heroId: number;
  heroName: string;
  currentPointWorth: number;
  totalBets: number;
  totalPoints: number;
}

/**
 * Parse gold amount string with optional "g" suffix for billions
 * Examples: "2g" = 2,000,000,000 | "1.5g" = 1,500,000,000 | "50000000" = 50,000,000
 */
const parseGoldAmount = (value: string): number => {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.endsWith("g")) {
    const num = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isNaN(num) ? 0 : Math.floor(num * 1_000_000_000);
  }
  const num = Number.parseInt(trimmed, 10);
  return Number.isNaN(num) ? 0 : num;
};

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
  const [eventId, setEventId] = useState(selectedEventId);
  const [heroId, setHeroId] = useState(selectedHeroId);
  const queryClient = useQueryClient();

  // Sync with parent filter state when modal opens
  useEffect(() => {
    if (open) {
      setEventId(selectedEventId);
      setHeroId(selectedHeroId);
    }
  }, [open, selectedEventId, selectedHeroId]);

  const { data: events } = useQuery(orpc.event.getAll.queryOptions());

  const { data: heroes } = useQuery(orpc.heroes.getAll.queryOptions());

  const filteredHeroes = (
    eventId === "all"
      ? heroes
      : heroes?.filter((h) => h.eventId?.toString() === eventId)
  )?.toSorted((a, b) => a.level - b.level);

  // Get hero stats when a specific hero is selected
  const { data: heroStats, isPending: heroStatsPending } = useQuery({
    ...orpc.bet.getHeroStats.queryOptions({
      input: { heroId: Number.parseInt(heroId, 10) },
    }),
    enabled: heroId !== "all" && open,
  });

  const form = useForm({
    defaultValues: {
      goldAmount: "",
    },
    onSubmit: async ({ value }) => {
      try {
        if (heroId === "all") {
          toast.error("Wybierz konkretnego herosa!");
          return;
        }

        const goldAmount = parseGoldAmount(value.goldAmount);
        if (goldAmount <= 0) {
          toast.error("Podaj prawidłową kwotę złota!");
          return;
        }

        const result = await orpc.bet.distributeGold.call({
          goldAmount,
          heroId: Number.parseInt(heroId, 10),
        });

        toast.success(
          `Rozdzielono ${goldAmount.toLocaleString("pl-PL")} złota dla ${result.usersUpdated} graczy`
        );
        await queryClient.invalidateQueries({
          queryKey: orpc.bet.getRanking.queryKey({ input: {} }),
        });
        await queryClient.invalidateQueries({
          queryKey: orpc.bet.getHeroStats.queryKey({
            input: { heroId: Number.parseInt(heroId, 10) },
          }),
        });
        setOpen(false);
        form.reset();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Nie udało się rozdzielić złota";
        toast.error(message);
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
    <ResponsiveDialog onOpenChange={setOpen} open={open}>
      <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="max-w-3 sm:max-w-[500px]">
        <form
          // oxlint-disable-next-line @typescript-eslint/no-misused-promises
          onSubmit={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await form.handleSubmit();
          }}
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
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
                  setEventId(value);
                  setHeroId("all");
                }}
                value={eventId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie eventy</SelectItem>
                  {[...(events ?? [])]
                    .toSorted(
                      (a, b) =>
                        new Date(b.endTime).getTime() -
                        new Date(a.endTime).getTime()
                    )
                    .map((event) => {
                      const IconComponent = getEventIcon(event.icon);
                      return (
                        <SelectItem key={event.id} value={event.id.toString()}>
                          <div className="flex items-center gap-2">
                            <IconComponent
                              className="h-4 w-4"
                              style={{ color: event.color ?? undefined }}
                            />
                            <span>{event.name}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>

            {/* Hero Select */}
            <div className="grid gap-1.5">
              <Label>Heros</Label>
              <Select onValueChange={setHeroId} value={heroId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz herosa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wybierz herosa...</SelectItem>
                  {filteredHeroes?.map((hero) => (
                    <SelectItem key={hero.id} value={hero.id.toString()}>
                      {hero.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hero Stats Preview */}
            {heroId !== "all" && (
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
                      disabled={heroId === "all"}
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
            {heroId !== "all" &&
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
                    heroId === "all" ||
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
