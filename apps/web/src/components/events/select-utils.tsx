import { Loader2 } from "lucide-react";

import { SelectItem } from "@/components/ui/select";
import { getEventIcon } from "@/lib/constants";
import { sortEventsByEndTimeDesc } from "@/lib/event-hero-filter";

export interface EventSelectOption {
  id: number;
  name: string;
  icon: string;
  color: string | null;
  endTime?: Date | string;
}

export interface HeroSelectOption {
  id: number;
  name: string;
  level?: number;
}

interface EventSelectItemsProps {
  events: EventSelectOption[] | undefined;
  allLabel?: string;
  includeAllOption?: boolean;
}

export const EventSelectItems = ({
  events,
  allLabel = "Wszystkie eventy",
  includeAllOption = true,
}: EventSelectItemsProps) => {
  const sortedEvents = sortEventsByEndTimeDesc(events);

  return (
    <>
      {includeAllOption && <SelectItem value="all">{allLabel}</SelectItem>}
      {sortedEvents.map((event) => {
        const IconComponent = getEventIcon(event.icon);

        return (
          <SelectItem key={event.id} value={event.id.toString()}>
            <div className="flex items-center gap-2">
              <IconComponent
                className="size-4"
                style={{ color: event.color ?? undefined }}
              />
              <span>{event.name}</span>
            </div>
          </SelectItem>
        );
      })}
    </>
  );
};

interface HeroSelectItemsProps {
  heroesLoading: boolean;
  sortedHeroes: HeroSelectOption[] | undefined;
  allLabel?: string;
  includeAllOption?: boolean;
  loadingLabel?: string;
}

export const HeroSelectItems = ({
  heroesLoading,
  sortedHeroes,
  allLabel = "Wszyscy herosi",
  includeAllOption = true,
  loadingLabel = "Ładowanie...",
}: HeroSelectItemsProps) => {
  if (heroesLoading) {
    return (
      <SelectItem disabled value="loading">
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <span>{loadingLabel}</span>
        </div>
      </SelectItem>
    );
  }

  return (
    <>
      {includeAllOption && <SelectItem value="all">{allLabel}</SelectItem>}
      {sortedHeroes?.map((hero) => (
        <SelectItem key={hero.id} value={hero.id.toString()}>
          {hero.name}
        </SelectItem>
      ))}
    </>
  );
};
