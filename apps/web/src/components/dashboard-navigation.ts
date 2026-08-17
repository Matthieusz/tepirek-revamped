import {
  Brain,
  Calculator,
  CalendarCheck,
  Gavel,
  ListChecks,
  Swords,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** A route displayed in dashboard navigation surfaces. */
export interface DashboardNavigationItem {
  readonly disabled?: boolean;
  readonly icon?: LucideIcon;
  readonly title: string;
  readonly url: string;
}

/** A named group of related dashboard routes. */
export interface DashboardNavigationGroup {
  readonly disabled?: boolean;
  readonly icon: LucideIcon;
  readonly isActive?: boolean;
  readonly items: readonly DashboardNavigationItem[];
  readonly title: string;
}

/** Grouped dashboard routes shared by the sidebar and command menu. */
export const dashboardNavigationGroups = [
  {
    icon: CalendarCheck,
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
    icon: Gavel,
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
    icon: Swords,
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
    icon: Calculator,
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
    icon: ListChecks,
    title: "Lista zadań",
    url: "/dashboard/tasks",
  },
  {
    icon: Brain,
    title: "Umiejętności",
    url: "/dashboard/skills",
  },
  {
    icon: Users,
    title: "Lista graczy",
    url: "/dashboard/player-list",
  },
  {
    icon: User,
    title: "Profil",
    url: "/dashboard/profile",
  },
] as const satisfies readonly DashboardNavigationItem[];
