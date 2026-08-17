import { Outlet } from "@tanstack/react-router";

import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { DashboardCommandMenu } from "@/components/dashboard-command-menu";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { AuthSession } from "@/types/route";

interface DashboardLayoutProps {
  session: AuthSession;
}

const DashboardLayout = ({ session }: DashboardLayoutProps) => (
  <SidebarProvider>
    <AppSidebar session={session} />
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            className="mr-2 data-[orientation=vertical]:h-4"
            orientation="vertical"
          />
          <BreadcrumbNav />
        </div>
        <DashboardCommandMenu />
      </header>
      <div className="flex min-h-0 w-full flex-1 px-6 py-6">
        <Outlet />
      </div>
    </SidebarInset>
  </SidebarProvider>
);

export default DashboardLayout;
