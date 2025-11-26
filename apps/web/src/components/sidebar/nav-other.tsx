import { Link, useMatchRoute } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavOther({
  projects,
}: {
  projects: {
    name: string;
    url: string;
    icon: LucideIcon;
    disabled?: boolean;
  }[];
}) {
  const matchRoute = useMatchRoute();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {projects.map((item) => {
          const isActive = matchRoute({ to: item.url, fuzzy: true });

          return (
            <SidebarMenuItem key={item.name}>
              {item.disabled ? (
                <SidebarMenuButton
                  className="cursor-not-allowed opacity-50"
                  tooltip={item.name}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  asChild
                  isActive={!!isActive}
                  tooltip={item.name}
                >
                  <Link preload="intent" to={item.url}>
                    <item.icon className="h-4 w-4" />
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
}
