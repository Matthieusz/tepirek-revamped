import { useNavigate } from "@tanstack/react-router";
import {
	Brain,
	Calculator,
	CalendarCheck,
	Gavel,
	ListChecks,
	LogOut,
	Settings,
	User,
	Users,
} from "lucide-react";
import type * as React from "react";
import { toast } from "sonner";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

// This is sample data.
const data = {
	navMain: [
		{
			title: "Eventy",
			url: "#",
			icon: CalendarCheck,
			items: [
				{
					title: "Lista eventów",
					url: "/dashboard/events/list",
				},
				{
					title: "Lista herosów",
					url: "/dashboard/events/heroes",
				},
				{
					title: "Dodaj obstawienie",
					url: "/dashboard/events/bets/add",
				},
				{
					title: "Historia",
					url: "/dashboard/events/history",
				},
				{
					title: "Ranking",
					url: "/dashboard/events/ranking",
				},
			],
		},
		{
			title: "Licytacje",
			url: "#",
			icon: Gavel,
			items: [
				{
					title: "Broni głównych",
					url: "/dashboard/auctions/main",
				},
				{
					title: "Broni pomocniczych",
					url: "/dashboard/auctions/support",
				},
				{
					title: "Bibelotów",
					url: "/dashboard/auctions/bibelots",
				},
			],
		},
		{
			title: "Squad Builder",
			url: "#",
			icon: Users,
			items: [
				{
					title: "Utwórz nową drużynę",
					url: "/dashboard/squad-builder/create",
				},
				{
					title: "Zarządzaj drużynami",
					url: "/dashboard/squad-builder/manage",
				},
			],
		},
		{
			title: "Kalkulatory",
			url: "#",
			icon: Calculator,
			items: [
				{
					title: "Ulepy",
					url: "/dashboard/calculator/ulepa",
				},
				{
					title: "Odwiązania",
					url: "/dashboard/calculator/odw",
				},
				{ title: "Lista", url: "/dashboard/calculator/list" },
			],
		},
	],
	projects: [
		{
			name: "Lista zadań",
			url: "/dashboard/tasks",
			icon: ListChecks,
		},
		{
			name: "Umiejętności",
			url: "/dashboard/skills",
			icon: Brain,
		},
		{
			name: "Lista graczy",
			url: "/dashboard/player-list",
			icon: Users,
		},
		{
			name: "Profil",
			url: "/dashboard/profile",
			icon: User,
		},
		{
			name: "Ustawienia",
			url: "/dashboard/settings",
			icon: Settings,
		},
	],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();
	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<div className="flex items-center gap-2">
					<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
						<User className="size-4" />
					</div>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-medium">Gildia Złodziei</span>
						<span className="truncate text-xs">v1.0</span>
					</div>
				</div>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={data.navMain} />
				<NavProjects projects={data.projects} />
			</SidebarContent>
			<SidebarFooter>
				<div className="flex items-center gap-2 p-2">
					{isPending ? (
						<>
							<Skeleton className="h-8 w-8 rounded-lg" />
							<div className="grid flex-1 gap-1 text-left text-sm leading-tight">
								<Skeleton className="h-4 w-24 rounded" />
								<Skeleton className="h-3 w-32 rounded" />
							</div>
							<Skeleton className="h-8 w-8 rounded-lg" />
						</>
					) : (
						<>
							<Avatar className="h-8 w-8 rounded-lg">
								<AvatarImage alt="User avatar" src="test" />
								<AvatarFallback className="rounded-lg">TEST</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">
									{session?.user.name}
								</span>
								<span className="truncate text-xs">{session?.user.email}</span>
							</div>
							<Button
								onClick={() =>
									authClient.signOut({
										fetchOptions: {
											onSuccess: () => {
												toast.success("Logout successful");
												navigate({
													to: "/",
												});
											},
											onError: (error) => {
												toast.error(
													error.error.message || error.error.statusText
												);
											},
										},
									})
								}
								size="icon"
								variant="destructive"
							>
								<LogOut className="size-4" />
							</Button>
						</>
					)}
				</div>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
