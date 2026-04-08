import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { SelectItem } from "@/components/ui/select";
import { getEventIcon } from "@/lib/constants";

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

const toEventTimestamp = (eventEndTime: Date | string | undefined): number => {
  if (eventEndTime === undefined) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = new Date(eventEndTime).getTime();
  if (Number.isNaN(timestamp)) {
    return Number.NEGATIVE_INFINITY;
  }

  return timestamp;
};

export const sortEventsByEndTimeDesc = (
  events: EventSelectOption[] | undefined
): EventSelectOption[] =>
  [...(events ?? [])].toSorted(
    (a, b) => toEventTimestamp(b.endTime) - toEventTimestamp(a.endTime)
  );

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

interface EventSelectDisplayParams {
  selectedEventId: string;
  events: EventSelectOption[] | undefined;
  allLabel?: string;
  placeholder?: string;
}

export const getEventSelectDisplay = ({
  selectedEventId,
  events,
  allLabel = "Wszystkie eventy",
  placeholder = "Wybierz event",
}: EventSelectDisplayParams): ReactNode => {
  if (selectedEventId === "all") {
    return allLabel;
  }

  const selectedEvent = events?.find(
    (event) => event.id.toString() === selectedEventId
  );

  if (!selectedEvent) {
    return placeholder;
  }

  const IconComponent = getEventIcon(selectedEvent.icon);

  return (
    <span className="flex items-center gap-2">
      <IconComponent
        className="size-4"
        style={{ color: selectedEvent.color ?? undefined }}
      />
      {selectedEvent.name}
    </span>
  );
};

interface HeroSelectDisplayParams {
  selectedEventId: string;
  selectedHeroId: string;
  sortedHeroes: HeroSelectOption[] | undefined;
  eventPlaceholder?: string;
  allLabel?: string;
  placeholder?: string;
}

export const getHeroSelectDisplay = ({
  selectedEventId,
  selectedHeroId,
  sortedHeroes,
  eventPlaceholder = "Wybierz event",
  allLabel = "Wszyscy herosi",
  placeholder = "Wybierz herosa",
}: HeroSelectDisplayParams): string => {
  if (selectedEventId === "all") {
    return eventPlaceholder;
  }

  if (selectedHeroId === "all") {
    return allLabel;
  }

  const selectedHero = sortedHeroes?.find(
    (hero) => hero.id.toString() === selectedHeroId
  );

  return selectedHero?.name ?? placeholder;
};
