import type { AuctionProfession, AuctionType } from "@tepirek-revamped/config";
import {
  AUCTION_PROFESSIONS,
  isAuctionProfession,
  isAuctionType,
} from "@tepirek-revamped/config";
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
import type { LucideIcon } from "lucide-react";

export { AUCTION_PROFESSIONS, isAuctionProfession, isAuctionType };
export type { AuctionProfession, AuctionType };

interface AuctionTypeMeta {
  crumb: string;
  indexTitle: string;
  professionDescription: string;
}

export const AUCTION_TYPE_META: Record<AuctionType, AuctionTypeMeta> = {
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
};

interface AuctionProfessionMeta {
  cardIcon: Record<AuctionType, LucideIcon>;
  headerIcon: LucideIcon;
  name: string;
}

export const AUCTION_PROFESSION_META: Record<
  AuctionProfession,
  AuctionProfessionMeta
> = {
  "blade-dancer": {
    cardIcon: {
      main: Swords,
      support: Swords,
    },
    headerIcon: Swords,
    name: "Tancerz Ostrzy",
  },
  hunter: {
    cardIcon: {
      main: Crosshair,
      support: Crosshair,
    },
    headerIcon: Target,
    name: "Łowca",
  },
  mage: {
    cardIcon: {
      main: Wand2,
      support: Wand2,
    },
    headerIcon: Flame,
    name: "Mag",
  },
  paladin: {
    cardIcon: {
      main: Shield,
      support: Shield,
    },
    headerIcon: Shield,
    name: "Paladyn",
  },
  tracker: {
    cardIcon: {
      main: Footprints,
      support: Footprints,
    },
    headerIcon: Footprints,
    name: "Tropiciel",
  },
  warrior: {
    cardIcon: {
      main: Axe,
      support: Axe,
    },
    headerIcon: Axe,
    name: "Wojownik",
  },
};
