import {
  Axe,
  CircleHelp,
  Crosshair,
  Footprints,
  Shield,
  Swords,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type KnownProfession =
  | "bladeDancer"
  | "hunter"
  | "mage"
  | "paladin"
  | "tracker"
  | "warrior";

export interface ProfessionPresentation {
  readonly colorClass: string;
  readonly icon: LucideIcon;
  readonly label: string;
}

const PROFESSION_PRESENTATIONS: Record<
  KnownProfession,
  ProfessionPresentation
> = {
  bladeDancer: {
    colorClass: "text-chart-1",
    icon: Swords,
    label: "Tancerz ostrzy",
  },
  hunter: {
    colorClass: "text-info",
    icon: Crosshair,
    label: "Łowca",
  },
  mage: {
    colorClass: "text-warning",
    icon: Wand2,
    label: "Mag",
  },
  paladin: {
    colorClass: "text-success",
    icon: Shield,
    label: "Paladyn",
  },
  tracker: {
    colorClass: "text-chart-4",
    icon: Footprints,
    label: "Tropiciel",
  },
  warrior: {
    colorClass: "text-destructive",
    icon: Axe,
    label: "Wojownik",
  },
};

const UNKNOWN_PROFESSION_PRESENTATION: ProfessionPresentation = {
  colorClass: "text-muted-foreground",
  icon: CircleHelp,
  label: "Nieznana profesja",
};

/** Returns shared icon, color, and localized label metadata for a profession. */
export const getProfessionPresentation = (
  profession: string
): ProfessionPresentation =>
  PROFESSION_PRESENTATIONS[profession as KnownProfession] ?? {
    ...UNKNOWN_PROFESSION_PRESENTATION,
    label:
      profession.length > 0
        ? profession
        : UNKNOWN_PROFESSION_PRESENTATION.label,
  };

/** Returns the localized label while preserving unknown API values. */
export const formatProfession = (profession: string): string =>
  getProfessionPresentation(profession).label;
