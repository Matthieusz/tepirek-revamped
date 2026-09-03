import {
  AxeIcon,
  CrosshairIcon,
  FootprintsIcon,
  HelpCircleIcon,
  MagicWand02Icon,
  Shield01Icon,
  Sword01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

type KnownProfession =
  | "bladeDancer"
  | "hunter"
  | "mage"
  | "paladin"
  | "tracker"
  | "warrior";

interface ProfessionPresentation {
  readonly colorClass: string;
  readonly icon: IconSvgElement;
  readonly label: string;
}

const UNKNOWN_PROFESSION_PRESENTATION: ProfessionPresentation = {
  colorClass: "text-muted-foreground",
  icon: HelpCircleIcon,
  label: "Nieznana profesja",
};

const PROFESSION_PRESENTATIONS = {
  bladeDancer: {
    colorClass: "text-chart-1",
    icon: Sword01Icon,
    label: "Tancerz ostrzy",
  },
  hunter: {
    colorClass: "text-info",
    icon: CrosshairIcon,
    label: "Łowca",
  },
  mage: {
    colorClass: "text-warning",
    icon: MagicWand02Icon,
    label: "Mag",
  },
  paladin: {
    colorClass: "text-success",
    icon: Shield01Icon,
    label: "Paladyn",
  },
  tracker: {
    colorClass: "text-chart-4",
    icon: FootprintsIcon,
    label: "Tropiciel",
  },
  warrior: {
    colorClass: "text-destructive",
    icon: AxeIcon,
    label: "Wojownik",
  },
} satisfies Record<KnownProfession, ProfessionPresentation>;

const isKnownProfession = (profession: string): profession is KnownProfession =>
  Object.hasOwn(PROFESSION_PRESENTATIONS, profession);

/** Returns shared icon, color, and localized label metadata for a profession. */
export const getProfessionPresentation = (
  profession: string
): ProfessionPresentation => {
  if (isKnownProfession(profession)) {
    return PROFESSION_PRESENTATIONS[profession];
  }

  return {
    ...UNKNOWN_PROFESSION_PRESENTATION,
    label:
      profession.length > 0
        ? profession
        : UNKNOWN_PROFESSION_PRESENTATION.label,
  };
};

/** Returns the localized label while preserving unknown API values. */
export const formatProfession = (profession: string): string =>
  getProfessionPresentation(profession).label;
