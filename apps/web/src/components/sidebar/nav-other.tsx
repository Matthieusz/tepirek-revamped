import { Link, useMatchRoute } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export const NavOther = ({
  projects,
}: {
  projects: {
    name: string;
    url: string;
    icon: LucideIcon;
    disabled?: boolean;
  }[];
}) => {
  const matchRoute = useMatchRoute();

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-muted-foreground text-xs">
        Inne
      </SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => {
          const isActive = matchRoute({ fuzzy: true, to: item.url });

          return (
            <SidebarMenuItem key={item.name}>
              {item.disabled ? (
                <SidebarMenuButton
                  className="cursor-not-allowed opacity-50"
                  tooltip={item.name}
                >
                  <item.icon className="size-4" />
                  <span>{item.name}</span>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  asChild
                  className={cn(
                    "transition-colors",
                    isActive && "bg-accent font-medium"
                  )}
                  isActive={!!isActive}
                  tooltip={item.name}
                >
                  <Link to={item.url}>
                    <item.icon className="size-4" />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
};
