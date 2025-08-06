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
					url: "#",
				},
				{
					title: "Lista herosów",
					url: "#",
				},
				{
					title: "Dodaj obstawienie",
					url: "#",
				},
				{
					title: "Historia",
					url: "#",
				},
				{
					title: "Ranking",
					url: "#",
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
					url: "#",
				},
				{
					title: "Broni pomocniczych",
					url: "#",
				},
				{
					title: "Bibelotów",
					url: "#",
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
					url: "#",
				},
				{
					title: "Zarządzaj drużynami",
					url: "#",
				},
			],
		},
	],
	projects: [
		{
			name: "Kalkulator ulepy",
			url: "#",
			icon: Calculator,
		},
		{
			name: "Kalkulator odw",
			url: "#",
			icon: Calculator,
		},
		{
			name: "Kalkulator lista",
			url: "#",
			icon: Calculator,
		},
		{
			name: "Lista zadań",
			url: "#",
			icon: ListChecks,
		},
		{
			name: "Umiejętności",
			url: "#",
			icon: Brain,
		},
		{
			name: "Lista graczy",
			url: "#",
			icon: Users,
		},
		{
			name: "Profil",
			url: "#",
			icon: User,
		},
		{
			name: "Ustawienia",
			url: "#",
			icon: Settings,
		},
	],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const navigate = useNavigate();
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
					<Avatar className="h-8 w-8 rounded-lg">
						<AvatarImage alt="User avatar" src="test" />
						<AvatarFallback className="rounded-lg">CN</AvatarFallback>
					</Avatar>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-medium">test</span>
						<span className="truncate text-xs">test</span>
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
										toast.error(error.error.message || error.error.statusText);
									},
								},
							})
						}
						size="icon"
						variant="destructive"
					>
						<LogOut className="size-4" />
					</Button>
				</div>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
