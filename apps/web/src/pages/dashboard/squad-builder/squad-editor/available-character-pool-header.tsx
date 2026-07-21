import * as HashSet from "effect/HashSet";
import { Search, X } from "lucide-react";

import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { getProfessionPresentation } from "../profession-presenters";

interface AvailableCharacterPoolHeaderProps {
  readonly characterNameQuery: string;
  readonly characterCount: number;
  readonly filteredCount: number;
  readonly groupId: number;
  readonly hasActiveFilters: boolean;
  readonly hasLevelError: boolean;
  readonly levelErrorId: string;
  readonly levelErrorMessage: string;
  readonly levelFromInput: string;
  readonly levelToInput: string;
  readonly selectedProfessions: HashSet.HashSet<string>;
  readonly unassignedCount: number;
  readonly onCharacterNameChange: (value: string) => void;
  readonly onClearFilters: () => void;
  readonly onLevelFromChange: (value: string) => void;
  readonly onLevelToChange: (value: string) => void;
  readonly onProfessionToggle: (profession: string) => void;
}

/** Renders the available-character pool heading and filter controls. */
export const AvailableCharacterPoolHeader = ({
  characterNameQuery,
  characterCount,
  filteredCount,
  groupId,
  hasActiveFilters,
  hasLevelError,
  levelErrorId,
  levelErrorMessage,
  levelFromInput,
  levelToInput,
  selectedProfessions,
  unassignedCount,
  onCharacterNameChange,
  onClearFilters,
  onLevelFromChange,
  onLevelToChange,
  onProfessionToggle,
}: AvailableCharacterPoolHeaderProps) => (
  <header className="shrink-0 space-y-3 border-b border-border px-4 py-3">
    <div className="flex items-center justify-between gap-2">
      <h2 className="font-semibold text-base" id="available-characters-heading">
        Dostępne postacie
      </h2>
      {characterCount > 0 && (
        <Badge className="font-mono" variant="secondary">
          {filteredCount} z {unassignedCount} dostępnych
        </Badge>
      )}
    </div>

    {characterCount > 0 && (
      <>
        <fieldset
          aria-label="Szybkie filtry profesji"
          className="flex flex-nowrap gap-1 overflow-x-auto pb-0.5"
        >
          {[
            "bladeDancer",
            "hunter",
            "mage",
            "paladin",
            "tracker",
            "warrior",
          ].map((profession) => {
            const presentation = getProfessionPresentation(profession);
            const ProfessionIcon = presentation.icon;
            const selected = HashSet.has(selectedProfessions, profession);
            return (
              <Button
                aria-pressed={selected}
                className={cn(
                  "h-6 min-h-0 gap-0.5 px-1 text-[10px]",
                  selected &&
                    "border-primary bg-primary/25 font-medium text-primary hover:bg-primary/30"
                )}
                key={profession}
                onClick={() => onProfessionToggle(profession)}
                size="sm"
                type="button"
                variant="outline"
              >
                <ProfessionIcon
                  aria-hidden="true"
                  className={`size-2.5 ${presentation.colorClass}`}
                />
                {presentation.label}
              </Button>
            );
          })}
        </fieldset>

        <div className="flex min-w-0 items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-2 left-2 size-3.5 text-muted-foreground"
            />
            <Input
              aria-label="Szukaj po nazwie postaci"
              className="h-8 pl-7"
              onChange={(event) => onCharacterNameChange(event.target.value)}
              placeholder="Nazwa postaci"
              value={characterNameQuery}
            />
          </div>
          <Button
            className="h-8 shrink-0 px-2 text-xs"
            disabled={!hasActiveFilters}
            onClick={onClearFilters}
            size="sm"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" className="size-3.5" />
            Wyczyść filtry
          </Button>
        </div>

        <div className="grid max-w-sm grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs" htmlFor={`level-from-${groupId}`}>
              Poziom od
            </Label>
            <Input
              aria-describedby={hasLevelError ? levelErrorId : undefined}
              aria-invalid={hasLevelError}
              className="h-8 font-mono"
              id={`level-from-${groupId}`}
              inputMode="numeric"
              min={1}
              onChange={(event) => onLevelFromChange(event.target.value)}
              placeholder="Min"
              step={1}
              type="number"
              value={levelFromInput}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor={`level-to-${groupId}`}>
              Poziom do
            </Label>
            <Input
              aria-describedby={hasLevelError ? levelErrorId : undefined}
              aria-invalid={hasLevelError}
              className="h-8 font-mono"
              id={`level-to-${groupId}`}
              inputMode="numeric"
              min={1}
              onChange={(event) => onLevelToChange(event.target.value)}
              placeholder="Maks"
              step={1}
              type="number"
              value={levelToInput}
            />
          </div>
        </div>
        {hasLevelError && (
          <p
            className="text-destructive text-xs"
            id={levelErrorId}
            role="alert"
          >
            {levelErrorMessage}
          </p>
        )}
      </>
    )}
  </header>
);
