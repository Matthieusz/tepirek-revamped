import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns/format";
import { Plus } from "lucide-react";
import { AddEventModal } from "@/components/modals/add-event-modal";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/events/list")({
	component: RouteComponent,
	loader: () => {
		return {
			crumb: "Lista eventów",
		};
	},
});

function RouteComponent() {
	const { data: session } = authClient.useSession();
	const events = useQuery(orpc.event.getAll.queryOptions());
	const queryClient = useQueryClient();
	return (
		<div className="flex flex-col gap-4">
			<div className="flex gap-4">
				<h1 className="font-bold text-3xl">Lista eventów</h1>
				{session?.user.role === "admin" && (
					<AddEventModal
						trigger={
							<Button>
								<Plus />
								Dodaj event
							</Button>
						}
					/>
				)}
			</div>
			<div>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[200px]">Nazwa</TableHead>
							<TableHead className="w-[200px]">Data zakończenia</TableHead>
							<TableHead className="w-[100px]">Aktywne</TableHead>
							{session?.user.role === "admin" && (
								<TableHead className="w-[150px] text-center">Akcje</TableHead>
							)}
						</TableRow>
					</TableHeader>
					{events.data?.map((event) => (
						<TableRow key={event.id}>
							<TableCell>{event.name}</TableCell>
							<TableCell>
								{format(new Date(event.endTime), "dd-MM-yyyy")}
							</TableCell>
							<TableCell>{event.active ? "Tak" : "Nie"}</TableCell>
							{session?.user.role === "admin" && (
								<TableCell className="flex items-center justify-center gap-2">
									<Button
										onClick={() => {
											if (
												window.confirm(
													`Czy na pewno chcesz ${event.active ? "dezaktywować" : "aktywować"} event "${event.name}"?`
												)
											) {
												orpc.event.toggleActive
													.call({
														id: event.id,
														active: !event.active,
													})
													.then(() => {
														queryClient.invalidateQueries({
															queryKey: orpc.event.getAll.queryKey(),
														});
													});
											}
										}}
										variant="ghost"
									>
										{event.active ? "Dezaktywuj" : "Aktywuj"}
									</Button>
									<Button
										onClick={() => {
											if (
												window.confirm(
													`Czy na pewno chcesz usunąć event "${event.name}"?`
												)
											) {
												orpc.event.delete.call({ id: event.id }).then(() => {
													queryClient.invalidateQueries({
														queryKey: orpc.event.getAll.queryKey(),
													});
												});
											}
										}}
										variant="destructive"
									>
										Usuń
									</Button>
								</TableCell>
							)}
						</TableRow>
					))}
				</Table>
			</div>
		</div>
	);
}
