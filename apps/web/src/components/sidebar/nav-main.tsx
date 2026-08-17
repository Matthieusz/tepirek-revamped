import { Link, useMatchRoute } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

import type {
  DashboardNavigationGroup,
  DashboardNavigationItem,
} from "@/components/dashboard-navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export const NavMain = ({
  items,
}: {
  items: readonly DashboardNavigationGroup[];
}) => {
  const matchRoute = useMatchRoute();

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-muted-foreground text-xs">
        Menu
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isGroupActive =
            item.items?.some(
              (subItem) =>
                matchRoute({ fuzzy: true, to: subItem.url }) !== false
            ) ?? false;

          return (
            // eslint-disable-next-line no-use-before-define
            <NavItemCollapsible
              isGroupActive={isGroupActive}
              item={item}
              key={item.title}
              matchRoute={matchRoute}
            />
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
};

const NavItemCollapsible = ({
  isGroupActive,
  item,
  matchRoute,
}: {
  isGroupActive: boolean;
  item: DashboardNavigationGroup;
  matchRoute: ReturnType<typeof useMatchRoute>;
}) => {
  const [open, setOpen] = useState(item.isActive ?? isGroupActive);

  return (
    <Collapsible
      onOpenChange={setOpen}
      open={open}
      render={
        <SidebarMenuItem>
          <CollapsibleTrigger
            render={
              <SidebarMenuButton
                className={cn(
                  "transition-colors",
                  item.disabled === true && "cursor-not-allowed opacity-50",
                  isGroupActive && "bg-accent font-medium"
                )}
                tooltip={item.title}
              >
                {item.icon && <item.icon className="size-4" />}
                <span>{item.title}</span>
                <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            }
          />
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.items.map((subItem: DashboardNavigationItem) => {
                const isActive = matchRoute({
                  fuzzy: true,
                  to: subItem.url,
                });

                return (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton
                      render={
                        <Link
                          className={cn(
                            "transition-colors",
                            subItem.disabled === true &&
                              "cursor-not-allowed opacity-50",
                            isActive !== false && "text-primary"
                          )}
                          disabled={subItem.disabled === true}
                          to={subItem.url}
                        >
                          {subItem.title}
                        </Link>
                      }
                      isActive={isActive !== false}
                    />
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      }
      className="group/collapsible"
    />
  );
};
