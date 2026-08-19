import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import type * as React from "react";
import { toast } from "sonner";

import {
  dashboardNavigationGroups,
  dashboardOtherNavigationItems,
} from "@/components/dashboard-navigation";
import { NavMain } from "@/components/sidebar/nav-main";
import { NavOther } from "@/components/sidebar/nav-other";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import type { AuthSession } from "@/types/route";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  session: AuthSession;
};

export const AppSidebar = ({ session, ...props }: AppSidebarProps) => {
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-sidebar-border border-b">
        <div className="flex items-center gap-3 py-1.5">
          <div className="bg-primary/10 flex aspect-square size-8 items-center justify-center rounded-lg">
            <img
              alt="Tepirek Revamped"
              className="size-6"
              height={24}
              src="/logo.svg"
              width={24}
            />
          </div>
          <div className="grid flex-1 text-left leading-tight group-data-[state=collapsed]:hidden">
            <span className="truncate text-sm font-semibold">
              Gildia Złodziei
            </span>
            <span className="text-muted-foreground truncate text-xs">
              Panel klanowy
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 group-data-[state=collapsed]:px-0">
        <NavMain items={dashboardNavigationGroups} />
        <NavOther items={dashboardOtherNavigationItems} />
      </SidebarContent>
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
            <span className="truncate text-sm font-medium">
              {session?.user.name}
            </span>
            <span className="text-muted-foreground truncate text-xs">
              {session?.user.email}
            </span>
          </div>
          <Button
            className="group-data-[state=collapsed]:size-8"
            // oxlint-disable-next-line @typescript-eslint/no-misused-promises
            onClick={async () => {
              await authClient.signOut({
                fetchOptions: {
                  onError: (error) => {
                    toast.error(error.error.message || error.error.statusText);
                  },
                  onSuccess: async () => {
                    toast.success("Wylogowano pomyślnie");
                    await navigate({
                      to: "/",
                    });
                  },
                },
              });
            }}
            aria-label="Wyloguj"
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
};
