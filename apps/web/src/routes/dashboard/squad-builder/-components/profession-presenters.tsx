import {
  Axe,
  CircleHelp,
  Crosshair,
  Footprints,
  Shield,
  Swords,
  Wand2,
} from "lucide-react";
import type { ReactElement, SVGProps } from "react";

type ProfessionIcon = (props: SVGProps<SVGSVGElement>) => ReactElement;

const AxeIcon: ProfessionIcon = (props) => <Axe {...props} />;
const CircleHelpIcon: ProfessionIcon = (props) => <CircleHelp {...props} />;
const CrosshairIcon: ProfessionIcon = (props) => <Crosshair {...props} />;
const FootprintsIcon: ProfessionIcon = (props) => <Footprints {...props} />;
const ShieldIcon: ProfessionIcon = (props) => <Shield {...props} />;
const SwordsIcon: ProfessionIcon = (props) => <Swords {...props} />;
const Wand2Icon: ProfessionIcon = (props) => <Wand2 {...props} />;

type KnownProfession =
  | "bladeDancer"
  | "hunter"
  | "mage"
  | "paladin"
  | "tracker"
  | "warrior";

interface ProfessionPresentation {
  readonly colorClass: string;
  readonly icon: ProfessionIcon;
  readonly label: string;
}

const UNKNOWN_PROFESSION_PRESENTATION: ProfessionPresentation = {
  colorClass: "text-muted-foreground",
  icon: CircleHelpIcon,
  label: "Nieznana profesja",
};

const PROFESSION_PRESENTATIONS = {
  bladeDancer: {
    colorClass: "text-chart-1",
    icon: SwordsIcon,
    label: "Tancerz ostrzy",
  },
  hunter: {
    colorClass: "text-info",
    icon: CrosshairIcon,
    label: "Łowca",
  },
  mage: {
    colorClass: "text-warning",
    icon: Wand2Icon,
    label: "Mag",
  },
  paladin: {
    colorClass: "text-success",
    icon: ShieldIcon,
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
