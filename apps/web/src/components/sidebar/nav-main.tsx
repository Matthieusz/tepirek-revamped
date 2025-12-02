import { Link, useMatchRoute } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";
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
      <SidebarGroupLabel className="text-muted-foreground text-xs">
        Menu
      </SidebarGroupLabel>
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
                      "transition-colors",
                      item.disabled && "cursor-not-allowed opacity-50",
                      isGroupActive && "bg-accent font-medium"
                    )}
                    tooltip={item.title}
                  >
                    {item.icon && <item.icon className="size-4" />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
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
                                "transition-colors",
                                subItem.disabled &&
                                  "cursor-not-allowed opacity-50",
                                isActive && "text-primary"
                              )}
                              disabled={!!subItem.disabled}
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
