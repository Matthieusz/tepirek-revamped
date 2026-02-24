import { useNavigate } from "@tanstack/react-router";
import {
  Brain,
  Calculator,
  CalendarCheck,
  Gavel,
  HeartIcon,
  ListChecks,
  LogOut,
  Settings,
  User,
  Users,
} from "lucide-react";
import type * as React from "react";
import { toast } from "sonner";
import { NavMain } from "@/components/sidebar/nav-main";
import { NavOther } from "@/components/sidebar/nav-other";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import type { AuthSession } from "@/lib/auth-guard";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";

const data = {
  navMain: [
    {
      title: "Eventy",
      url: "#",
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
    },
    {
      title: "Licytacje",
      url: "#",
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
    },
    {
      title: "Squad Builder",
      url: "#",
      icon: Users,
      items: [
        {
          title: "Zarządzaj kontami",
          url: "/dashboard/squad-builder/accounts",
        },
        {
          title: "Utwórz nową drużynę",
          url: "/dashboard/squad-builder/create",
        },
        {
          title: "Zarządzaj drużynami",
          url: "/dashboard/squad-builder/manage",
        },
      ],
    },
    {
      title: "Kalkulatory",
      url: "#",
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
        { title: "Lista", url: "/dashboard/calculator/list" },
      ],
    },
  ],
  projects: [
    {
      name: "Lista zadań",
      url: "/dashboard/tasks",
      icon: ListChecks,
    },
    {
      name: "Umiejętności",
      url: "/dashboard/skills",
      icon: Brain,
    },
    {
      name: "Lista graczy",
      url: "/dashboard/player-list",
      icon: Users,
    },
    {
      name: "Profil",
      url: "/dashboard/profile",
      icon: User,
    },
    {
      name: "Ustawienia",
      url: "/dashboard/settings",
      icon: Settings,
      disabled: true,
    },
  ],
};

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  session: AuthSession;
};

export function AppSidebar({ session, ...props }: AppSidebarProps) {
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-sidebar-border border-b">
        <div className="flex items-center gap-3 py-1.5">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10">
            <img
              alt="Logo"
              className="size-6 rounded"
              height={24}
              src="/favicon.ico"
              width={24}
            />
          </div>
          <div className="grid flex-1 text-left leading-tight group-data-[state=collapsed]:hidden">
            <span className="truncate font-semibold text-sm">
              Gildia Złodziei
            </span>
            <span className="truncate text-muted-foreground text-xs">
              Panel klanowy
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 group-data-[state=collapsed]:px-0">
        <NavMain items={data.navMain} />
        <NavOther projects={data.projects} />
      </SidebarContent>
      <div className="mx-3 mb-3 rounded-lg bg-muted/50 px-3 py-2 group-data-[state=collapsed]:hidden">
        <p className="flex items-center justify-center gap-1 text-muted-foreground text-xs">
          Made with{" "}
          <HeartIcon className="inline size-3.5 fill-red-500 text-red-500" /> by{" "}
          <span className="font-medium text-foreground hover:underline">
            <a
              href="https://github.com/Matthieusz"
              rel="noopener noreferrer"
              target="_blank"
            >
              informati
            </a>
          </span>
        </p>
      </div>
      <SidebarFooter className="border-sidebar-border border-t">
        <div className="flex items-center gap-3 px-1 py-1.5 group-data-[state=collapsed]:flex-col group-data-[state=collapsed]:gap-3 group-data-[state=collapsed]:py-2">
          <Avatar className="size-8 rounded-lg">
            <AvatarImage
              alt="User avatar"
              src={session?.user.image ?? undefined}
            />
            <AvatarFallback className="rounded-lg text-xs">
              {session?.user.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left leading-tight group-data-[state=collapsed]:hidden">
            <span className="truncate font-medium text-sm">
              {session?.user.name}
            </span>
            <span className="truncate text-muted-foreground text-xs">
              {session?.user.email}
            </span>
          </div>
          <Button
            className="group-data-[state=collapsed]:size-8"
            onClick={() =>
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    toast.success("Wylogowano pomyślnie");
                    navigate({
                      to: "/",
                    });
                  },
                  onError: (error) => {
                    toast.error(error.error.message || error.error.statusText);
                  },
                },
              })
            }
            size="icon"
            variant="destructive"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
