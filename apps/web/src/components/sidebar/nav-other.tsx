import { Link, useMatchRoute } from "@tanstack/react-router";

import type { DashboardNavigationItem } from "@/components/dashboard-navigation";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export const NavOther = ({
  items,
}: {
  items: readonly DashboardNavigationItem[];
}) => {
  const matchRoute = useMatchRoute();

  if (items.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-muted-foreground text-xs">
        Inne
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = matchRoute({ fuzzy: true, to: item.url });
          const ItemIcon = item.icon;

          return (
            <SidebarMenuItem key={item.title}>
              {item.disabled === true ? (
                <SidebarMenuButton
                  className="cursor-not-allowed opacity-50"
                  tooltip={item.title}
                >
                  {ItemIcon ? <ItemIcon className="size-4" /> : null}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  render={
                    <Link to={item.url}>
                      {ItemIcon ? <ItemIcon className="size-4" /> : null}
                      <span>{item.title}</span>
                    </Link>
                  }
                  className={cn(
                    "transition-colors",
                    isActive !== false && "bg-accent font-medium"
                  )}
                  isActive={isActive !== false}
                  tooltip={item.title}
                />
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
};
