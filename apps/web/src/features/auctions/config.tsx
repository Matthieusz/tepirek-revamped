import type { AuctionProfession, AuctionType } from "@tepirek-revamped/config";
import {
  Axe,
  Crosshair,
  Flame,
  Footprints,
  Shield,
  Swords,
  Target,
  Wand2,
} from "lucide-react";
import type { ReactElement, SVGProps } from "react";

type AuctionIcon = (props: SVGProps<SVGSVGElement>) => ReactElement;

const AxeIcon: AuctionIcon = (props) => <Axe {...props} />;
const CrosshairIcon: AuctionIcon = (props) => <Crosshair {...props} />;
const FlameIcon: AuctionIcon = (props) => <Flame {...props} />;
const FootprintsIcon: AuctionIcon = (props) => <Footprints {...props} />;
const ShieldIcon: AuctionIcon = (props) => <Shield {...props} />;
const SwordsIcon: AuctionIcon = (props) => <Swords {...props} />;
const TargetIcon: AuctionIcon = (props) => <Target {...props} />;
const Wand2Icon: AuctionIcon = (props) => <Wand2 {...props} />;

export {
  AUCTION_PROFESSIONS,
  isAuctionProfession,
  isAuctionType,
} from "@tepirek-revamped/config";
export type { AuctionProfession, AuctionType } from "@tepirek-revamped/config";

interface AuctionTypeMeta {
  crumb: string;
  indexTitle: string;
  professionDescription: string;
}

export const AUCTION_TYPE_META = {
  main: {
    crumb: "Bronie główne",
    indexTitle: "Licytacje broni głównych",
    professionDescription: "Licytacje broni głównych",
  },
  support: {
    crumb: "Bronie pomocnicze",
    indexTitle: "Licytacje broni pomocniczych",
    professionDescription: "Licytacje broni wsparcia",
  },
} satisfies Record<AuctionType, AuctionTypeMeta>;

interface AuctionProfessionMeta {
  cardIcon: Record<AuctionType, AuctionIcon>;
  headerIcon: AuctionIcon;
  name: string;
}

export const AUCTION_PROFESSION_META = {
  "blade-dancer": {
    cardIcon: {
      main: SwordsIcon,
      support: SwordsIcon,
    },
    headerIcon: SwordsIcon,
    name: "Tancerz Ostrzy",
  },
  hunter: {
    cardIcon: {
      main: CrosshairIcon,
      support: CrosshairIcon,
    },
    headerIcon: TargetIcon,
    name: "Łowca",
  },
  mage: {
    cardIcon: {
      main: Wand2Icon,
      support: Wand2Icon,
    },
    headerIcon: FlameIcon,
    name: "Mag",
  },
  paladin: {
    cardIcon: {
      main: ShieldIcon,
      support: ShieldIcon,
    },
    headerIcon: ShieldIcon,
    name: "Paladyn",
  },
  tracker: {
    cardIcon: {
      main: FootprintsIcon,
      support: FootprintsIcon,
    },
    headerIcon: FootprintsIcon,
    name: "Tropiciel",
  },
  warrior: {
    cardIcon: {
      main: AxeIcon,
      support: AxeIcon,
    },
    headerIcon: AxeIcon,
    name: "Wojownik",
  },
} satisfies Record<AuctionProfession, AuctionProfessionMeta>;
