import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { useNavigate } from "@tanstack/react-router";
import type {
  LegendaryEquipmentType,
  LegendaryProfession,
} from "@tepirek-revamped/api/protocol/legend-pricing/http-api-contract";
import { Search } from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { AsyncResultBoundary } from "@/components/ui/async-result-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  legendPricesAtom,
  updateLegendCostAtom,
} from "@/features/legend-pricing/legend-pricing-atoms";
import type { LegendPrice } from "@/features/legend-pricing/legend-pricing-atoms";
import { getErrorMessage } from "@/lib/errors";
import { formatGoldAmountInput, tryParseGoldAmount } from "@/lib/gold";
import { groupLegendPricesByEnemy } from "@/routes/dashboard/-components/cennik-groups";
import type { LegendPriceGroup } from "@/routes/dashboard/-components/cennik-groups";
import { formatLegendaryBonus } from "@/routes/dashboard/-components/legendary-bonus";
import type { CennikSearch } from "@/routes/dashboard/cennik";
import type { AuthSession } from "@/types/route";

const equipmentLabels = {
  armor: "Zbroja",
  boots: "Buty",
  gloves: "Rękawice",
  helmet: "Hełm",
  necklace: "Naszyjnik",
  orb: "Orba",
  ring: "Pierścień",
  shield: "Tarcza",
  weapon: "Broń",
} satisfies Record<LegendaryEquipmentType, string>;

const professionLabels = {
  bladeDancer: "Tancerz ostrzy",
  hunter: "Łowca",
  mage: "Mag",
  paladin: "Paladyn",
  tracker: "Tropiciel",
  warrior: "Wojownik",
} satisfies Record<LegendaryProfession, string>;

const enemyCategoryLabels = {
  elite2: "Elita II",
  hero: "Heros",
} as const;

const enemyCategoryFilterLabels = {
  elite2: "Elity II",
  hero: "Herosi",
} as const;

const parseEnemyCategory = (
  value: string | null
): CennikSearch["monsterType"] => {
  if (value === "hero" || value === "elite2") {
    return value;
  }

  return undefined;
};

const SEARCH_URL_SYNC_DELAY_MS = 200;

const legendPriceDateFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Warsaw",
});

const formatDate = (value: Date): string =>
  legendPriceDateFormatter.format(value);

const LegendPriceCard = ({
  isAdmin,
  item,
  priceInputId,
}: {
  readonly isAdmin: boolean;
  readonly item: LegendPrice;
  readonly priceInputId: string;
}) => {
  const updateCost = useAtomSet(updateLegendCostAtom, { mode: "promise" });
  const [price, setPrice] = useState(
    item.priceGold === null ? "" : formatGoldAmountInput(item.priceGold)
  );
  const [saving, setSaving] = useState(false);

  const savePrice = async () => {
    const parsedPrice = tryParseGoldAmount(price);
    if (parsedPrice === undefined || parsedPrice < 0) {
      toast.error("Podaj nieujemną cenę całkowitą, np. 700m albo 1.2g.");
      return;
    }

    setSaving(true);
    try {
      await updateCost({
        expectedVersion: item.version,
        itemId: item.itemId,
        priceGold: parsedPrice,
      });
      setPrice(formatGoldAmountInput(parsedPrice));
      toast.success("Cena została zapisana");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Nie udało się zapisać ceny."));
    }
    setSaving(false);
  };

  return (
    <li className="border-border bg-background flex min-w-0 flex-col gap-2 rounded-lg border p-3">
      <div className="flex min-w-0 items-start gap-2">
        <img
          alt=""
          className="size-10 shrink-0 rounded object-contain"
          height={80}
          src={item.iconUrl}
          width={80}
        />
        <div className="min-w-0">
          <h3 className="text-sm font-medium break-words">{item.name}</h3>
          <p className="text-muted-foreground text-xs">
            Lvl {item.level} · {equipmentLabels[item.equipmentType]}
          </p>
          <p className="text-muted-foreground text-xs">
            {item.professions.length > 0
              ? item.professions
                  .map((profession) => professionLabels[profession])
                  .join(", ")
              : "Wszystkie profesje"}
          </p>
        </div>
      </div>

      {item.legendaryBonus ? (
        <p className="text-muted-foreground text-xs">
          Bonus legendarny: {formatLegendaryBonus(item.legendaryBonus)}
        </p>
      ) : null}

      <div className="mt-auto space-y-1">
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <Label className="sr-only" htmlFor={priceInputId}>
              Cena w złocie
            </Label>
            <Input
              className="min-w-0 flex-1"
              disabled={saving}
              id={priceInputId}
              onChange={(event) => {
                setPrice(event.currentTarget.value);
              }}
              placeholder="Cena, np. 700m / 1.2g"
              type="text"
              value={price}
            />
            <Button
              disabled={saving}
              onClick={() => {
                void savePrice();
              }}
              size="sm"
            >
              {saving ? "Zapisywanie…" : "Zapisz"}
            </Button>
          </div>
        ) : (
          <p className="text-sm">
            <span className="text-muted-foreground">Cena: </span>
            <span
              className={
                item.priceGold === null
                  ? "text-muted-foreground"
                  : "font-semibold"
              }
            >
              {item.priceGold === null
                ? "Brak ceny"
                : formatGoldAmountInput(item.priceGold)}
            </span>
          </p>
        )}
        {item.priceUpdatedAt ? (
          <p className="text-muted-foreground text-xs">
            Zaktualizowano {formatDate(item.priceUpdatedAt)}
          </p>
        ) : null}
      </div>
    </li>
  );
};

const LegendPriceMonsterGroup = ({
  group,
  isAdmin,
}: {
  readonly group: LegendPriceGroup;
  readonly isAdmin: boolean;
}) => (
  <article
    aria-labelledby={`legend-enemy-${group.enemy.id}`}
    className="border-border bg-card overflow-hidden rounded-xl border"
  >
    <div className="grid gap-3 p-3 md:grid-cols-[9rem_minmax(0,1fr)]">
      <div className="flex flex-col items-center text-center">
        <div className="min-w-0">
          <h2
            className="font-serif text-sm font-bold break-words"
            id={`legend-enemy-${group.enemy.id}`}
          >
            {group.enemy.name}
          </h2>
          <p className="text-muted-foreground text-xs">
            Lvl {group.enemy.level} ·{" "}
            {enemyCategoryLabels[group.enemy.category]}
          </p>
        </div>
        <img
          alt=""
          className="mt-2 size-16 object-contain"
          height={80}
          src={group.enemy.iconUrl}
          width={80}
        />
      </div>

      <ul className="grid min-w-0 items-start gap-2 lg:grid-cols-2 xl:grid-cols-3">
        {group.items.map((item) => (
          <LegendPriceCard
            isAdmin={isAdmin}
            item={item}
            key={`${item.itemId}:${item.version}`}
            priceInputId={`legend-price-${group.enemy.id}-${item.itemId}`}
          />
        ))}
      </ul>
    </div>
  </article>
);

interface CennikPageProps {
  readonly search: CennikSearch;
  readonly session: AuthSession;
}

const CennikPage = ({ search, session }: CennikPageProps) => {
  const pricesResult = useAtomValue(legendPricesAtom);
  const refreshPrices = useAtomRefresh(legendPricesAtom);

  return (
    <AsyncResultBoundary onRetry={refreshPrices} result={pricesResult}>
      {(prices) => (
        // oxlint-disable-next-line no-use-before-define
        <CennikContent
          isAdmin={session.user.role === "admin"}
          prices={prices}
          search={search}
        />
      )}
    </AsyncResultBoundary>
  );
};

/** Render the filter controls and grouped legendary price catalog. */
export const CennikContent = ({
  isAdmin,
  prices,
  search,
}: {
  readonly isAdmin: boolean;
  readonly prices: readonly LegendPrice[];
  readonly search: CennikSearch;
}) => {
  const navigate = useNavigate({ from: "/dashboard/cennik" });
  const pendingSearch = useRef(search);
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    pendingSearch.current = search;
  }, [search]);
  useEffect(
    () => () => {
      if (syncTimeout.current !== null) {
        clearTimeout(syncTimeout.current);
      }
    },
    []
  );

  const updateSearch = useCallback(
    (update: Partial<CennikSearch>) => {
      const nextSearch = { ...pendingSearch.current, ...update };
      pendingSearch.current = nextSearch;
      if (syncTimeout.current !== null) {
        clearTimeout(syncTimeout.current);
      }
      syncTimeout.current = setTimeout(() => {
        syncTimeout.current = null;
        void navigate({ replace: true, search: nextSearch });
      }, SEARCH_URL_SYNC_DELAY_MS);
    },
    [navigate]
  );
  const groups = useMemo(
    () => groupLegendPricesByEnemy(prices, deferredSearch),
    [deferredSearch, prices]
  );
  const itemCount = groups.reduce(
    (count, group) => count + group.items.length,
    0
  );

  return (
    <div className="mx-auto w-full max-w-[min(100%,1400px)] space-y-6">
      <div>
        <h1 className="text-foreground font-serif text-2xl font-bold tracking-tight">
          Cennik legend
        </h1>
        <p className="text-muted-foreground text-sm">
          Legendarne przedmioty pogrupowane według potworów, z których można je
          zdobyć.
        </p>
      </div>

      <div className="border-border bg-card grid gap-3 rounded-xl border p-4 md:grid-cols-2 lg:grid-cols-4">
        {/* oxlint-disable-next-line no-use-before-define */}
        <SearchFilter
          id="legend-item-name"
          label="Nazwa przedmiotu"
          onChange={(value) => {
            updateSearch({ itemName: value });
          }}
          placeholder="Szukaj przedmiotu…"
          value={search.itemName}
        />
        {/* oxlint-disable-next-line no-use-before-define */}
        <SearchFilter
          id="legend-monster-name"
          label="Nazwa potwora"
          onChange={(value) => {
            updateSearch({ monsterName: value });
          }}
          placeholder="Szukaj potwora…"
          value={search.monsterName}
        />
        {/* oxlint-disable-next-line no-use-before-define */}
        <ItemLevelFilter
          onChange={(value) => {
            updateSearch({ itemLevel: value });
          }}
          value={search.itemLevel}
        />
        <div className="space-y-2">
          <Label htmlFor="legend-monster-type">Typ potwora</Label>
          <Select
            onValueChange={(value) => {
              updateSearch({ monsterType: parseEnemyCategory(value) });
            }}
            value={search.monsterType ?? "all"}
          >
            <SelectTrigger className="w-full" id="legend-monster-type">
              <SelectValue>
                {search.monsterType === undefined
                  ? "Wszystkie"
                  : enemyCategoryFilterLabels[search.monsterType]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="hero">Herosi</SelectItem>
              <SelectItem value="elite2">Elity II</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Potwory i ich legendy</h2>
        <p className="text-muted-foreground text-sm">
          {groups.length} potw. · {itemCount} przedm.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="border-border bg-card rounded-xl border p-8">
          <p className="text-muted-foreground text-center text-sm">
            Nie znaleziono przedmiotów spełniających wybrane kryteria.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <LegendPriceMonsterGroup
              group={group}
              isAdmin={isAdmin}
              key={group.enemy.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ItemLevelFilter = ({
  onChange,
  value,
}: {
  readonly onChange: (value: string | undefined) => void;
  readonly value: string | undefined;
}) => {
  const [localValue, setLocalValue] = useState(value ?? "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLocalValue(value ?? "");
    }, 0);
    return () => {
      clearTimeout(timeout);
    };
  }, [value]);

  return (
    <div className="space-y-2">
      <Label htmlFor="legend-item-level">Lvl przedmiotu</Label>
      <Input
        id="legend-item-level"
        min={1}
        onChange={(event) => {
          const nextValue = event.currentTarget.value;
          setLocalValue(nextValue);
          onChange(nextValue || undefined);
        }}
        placeholder="Np. 100"
        type="number"
        value={localValue}
      />
    </div>
  );
};

const SearchFilter = ({
  id,
  label,
  onChange,
  placeholder,
  value,
}: {
  readonly id: string;
  readonly label: string;
  readonly onChange: (value: string | undefined) => void;
  readonly placeholder: string;
  readonly value: string | undefined;
}) => {
  const [localValue, setLocalValue] = useState(value ?? "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLocalValue(value ?? "");
    }, 0);
    return () => {
      clearTimeout(timeout);
    };
  }, [value]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="text-muted-foreground absolute top-2.5 left-2.5 size-4"
        />
        <Input
          className="pl-8"
          id={id}
          onChange={(event) => {
            const nextValue = event.currentTarget.value;
            setLocalValue(nextValue);
            onChange(nextValue || undefined);
          }}
          placeholder={placeholder}
          value={localValue}
        />
      </div>
    </div>
  );
};

export default CennikPage;
