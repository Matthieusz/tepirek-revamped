import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import Loader from "@/components/loader";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { requireVerified } from "@/lib/auth-guard";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
  staticData: {
    crumb: "Dashboard",
  },
  beforeLoad: async () => {
    const session = await requireVerified();
    return {
      session: session.user,
    };
  },
  pendingComponent: () => (
    <div className="h-full">
      <Loader />
    </div>
  ),
  errorComponent: () => (
    <div className="flex h-full items-center justify-center">
      <p className="text-gray-500 text-lg">
        Wystąpił błąd podczas ładowania strony.
      </p>
    </div>
  ),
});

function RouteComponent() {
  return (
    <SidebarProvider>
      <AppSidebar />
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
        </header>
        <div className="container flex h-full w-full px-6 py-2">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
