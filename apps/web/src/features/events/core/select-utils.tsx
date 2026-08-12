import { Loader2 } from "lucide-react";

import { SelectItem } from "@/components/ui/select";
import { sortEventsByEndTimeDesc } from "@/features/events/core/event-hero-filter";
import type {
  EventSelectOption,
  HeroSelectOption,
} from "@/features/events/core/event-hero-options";
import { getEventIcon } from "@/lib/constants";

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
