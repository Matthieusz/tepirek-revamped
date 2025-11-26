import { Link, useMatchRoute } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    disabled?: boolean;
    items?: {
      title: string;
      url: string;
      disabled?: boolean;
    }[];
  }[];
}) {
  const matchRoute = useMatchRoute();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const isGroupActive = item.items?.some((subItem) =>
            matchRoute({ to: subItem.url, fuzzy: true })
          );

          return (
            <Collapsible
              asChild
              className="group/collapsible"
              defaultOpen={item.isActive || isGroupActive}
              key={item.title}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    className={cn(
                      item.disabled && "cursor-not-allowed opacity-50",
                      isGroupActive &&
                        "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                    tooltip={item.title}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => {
                      const isActive = matchRoute({
                        to: subItem.url,
                        fuzzy: true,
                      });

                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={!!isActive}>
                            <Link
                              className={cn(
                                subItem.disabled &&
                                  "cursor-not-allowed opacity-50",
                                isActive &&
                                  "before:-left-2 before:-translate-y-1/2 relative before:absolute before:top-1/2 before:h-4 before:w-1 before:rounded-full before:bg-primary"
                              )}
                              disabled={!!subItem.disabled}
                              preload="intent"
                              to={subItem.url}
                            >
                              {subItem.title}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
