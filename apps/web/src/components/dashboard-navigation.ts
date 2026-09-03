import {
  Brain03Icon,
  CalculatorIcon,
  CalendarCheckIcon,
  Coins02Icon,
  AuctionIcon,
  ListChecksIcon,
  Sword01Icon,
  UserIcon,
  UsersIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

/** A route displayed in dashboard navigation surfaces. */
export interface DashboardNavigationItem {
  readonly disabled?: boolean;
  readonly icon?: IconSvgElement;
  readonly title: string;
  readonly url: string;
}

/** A named group of related dashboard routes. */
export interface DashboardNavigationGroup {
  readonly disabled?: boolean;
  readonly icon: IconSvgElement;
  readonly isActive?: boolean;
  readonly items: readonly DashboardNavigationItem[];
  readonly title: string;
}

/** Grouped dashboard routes shared by the sidebar and command menu. */
export const dashboardNavigationGroups = [
  {
    icon: CalendarCheckIcon,
    items: [
      {
        title: "Lista eventów",
        url: "/dashboard/events/list",
      },
      {
        title: "Lista herosów",
        url: "/dashboard/events/heroes",
      },
      {
        title: "Dodaj obstawienie",
        url: "/dashboard/events/bets/add",
      },
      {
        title: "Historia",
        url: "/dashboard/events/history",
      },
      {
        title: "Ranking",
        url: "/dashboard/events/ranking",
      },
      {
        title: "Skarbiec",
        url: "/dashboard/events/vault",
      },
    ],
    title: "Eventy",
  },
  {
    icon: AuctionIcon,
    items: [
      {
        title: "Broni głównych",
        url: "/dashboard/auctions/main",
      },
      {
        title: "Broni pomocniczych",
        url: "/dashboard/auctions/support",
      },
    ],
    title: "Licytacje",
  },
  {
    icon: Sword01Icon,
    items: [
      {
        title: "Konta",
        url: "/dashboard/squad-builder/accounts",
      },
      {
        title: "Składy",
        url: "/dashboard/squad-builder/squads",
      },
    ],
    title: "Składy",
  },
  {
    icon: CalculatorIcon,
    items: [
      {
        title: "Ulepy",
        url: "/dashboard/calculator/ulepa",
      },
      {
        title: "Odwiązania",
        url: "/dashboard/calculator/odw",
      },
      {
        title: "Lista",
        url: "/dashboard/calculator/list",
      },
    ],
    title: "Kalkulatory",
  },
] as const satisfies readonly DashboardNavigationGroup[];

/** Standalone dashboard routes shared by the sidebar and command menu. */
export const dashboardOtherNavigationItems = [
  {
    icon: Coins02Icon,
    title: "Cennik legend",
    url: "/dashboard/cennik",
  },
  {
    icon: ListChecksIcon,
    title: "Lista zadań",
    url: "/dashboard/tasks",
  },
  {
    icon: Brain03Icon,
    title: "Umiejętności",
    url: "/dashboard/skills",
  },
  {
    icon: UsersIcon,
    title: "Lista graczy",
    url: "/dashboard/player-list",
  },
  {
    icon: UserIcon,
    title: "Profil",
    url: "/dashboard/profile",
  },
] as const satisfies readonly DashboardNavigationItem[];
