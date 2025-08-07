import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import Loader from "@/components/loader";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
	loader: () => ({
		crumb: "Dashboard",
	}),
	errorComponent: () => (
		<div className="flex h-full items-center justify-center">
			<p className="text-gray-500 text-lg">
				Wystąpił błąd podczas ładowania strony.
			</p>
		</div>
	),
});

function RouteComponent() {
	const navigate = Route.useNavigate();
	const { data: session, isPending } = authClient.useSession();

	useEffect(() => {
		if (!(session || isPending)) {
			navigate({
				to: "/login",
			});
		}
	}, [session, isPending, navigate]);

	if (isPending) {
		return (
			<div className="h-full">
				<Loader />
			</div>
		);
	}

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator
							className="mr-2 data-[orientation=vertical]:h-4"
							orientation="vertical"
						/>
						<BreadcrumbNav />
					</div>
				</header>
				<div className="container flex h-full w-full overflow-hidden px-6 py-2">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
