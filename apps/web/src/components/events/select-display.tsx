import type { ReactNode } from "react";

import type {
  EventSelectOption,
  HeroSelectOption,
} from "@/components/events/select-utils";
import { getEventIcon } from "@/lib/constants";

interface EventSelectDisplayParams {
  selectedEventId: string;
  events: EventSelectOption[] | undefined;
  allLabel?: string;
  placeholder?: string;
}

const getEventSelectDisplay = ({
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

const getHeroSelectDisplay = ({
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

export { getEventSelectDisplay, getHeroSelectDisplay };
