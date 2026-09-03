import {
  AxeIcon,
  CrosshairIcon,
  FlameIcon,
  FootprintsIcon,
  MagicWand02Icon,
  Shield01Icon,
  Sword01Icon,
  Target01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { AuctionProfession, AuctionType } from "@tepirek-revamped/config";

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
  cardIcon: Record<AuctionType, IconSvgElement>;
  headerIcon: IconSvgElement;
  name: string;
}

export const AUCTION_PROFESSION_META = {
  "blade-dancer": {
    cardIcon: {
      main: Sword01Icon,
      support: Sword01Icon,
    },
    headerIcon: Sword01Icon,
    name: "Tancerz Ostrzy",
  },
  hunter: {
    cardIcon: {
      main: CrosshairIcon,
      support: CrosshairIcon,
    },
    headerIcon: Target01Icon,
    name: "Łowca",
  },
  mage: {
    cardIcon: {
      main: MagicWand02Icon,
      support: MagicWand02Icon,
    },
    headerIcon: FlameIcon,
    name: "Mag",
  },
  paladin: {
    cardIcon: {
      main: Shield01Icon,
      support: Shield01Icon,
    },
    headerIcon: Shield01Icon,
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
