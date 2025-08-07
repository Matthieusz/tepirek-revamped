import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { orpc } from "@/utils/orpc";

interface AddHeroModalProps {
	trigger: React.ReactNode;
}

type AddHeroModal = {
	name: string;
	image?: string;
	eventId: string;
};

const defaultValues: AddHeroModal = {
	name: "",
	image: "",
	eventId: "",
};

export function AddHeroModal({ trigger }: AddHeroModalProps) {
	const [open, setOpen] = useState(false);
	const queryClient = useQueryClient();
	const events = useQuery(orpc.event.getAll.queryOptions());

	const form = useForm({
		defaultValues: {
			...defaultValues,
		},
		onSubmit: async ({ value }) => {
			try {
				if (!value.eventId) {
					toast.error("Wybierz event!");
					return;
				}

				await orpc.heroes.create.call({
					name: value.name,
					image: value.image || undefined,
					eventId: Number.parseInt(value.eventId, 10),
				});

				toast.success("Bohater utworzony pomyślnie");
				queryClient.invalidateQueries({
					queryKey: orpc.heroes.getAll.queryKey(),
				});
				setOpen(false);
				form.reset();
			} catch (_) {
				toast.error("Nie udało się utworzyć bohatera");
			}
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(1, "Nazwa bohatera jest wymagana"),
				image: z.string().optional(),
				eventId: z.string().min(1, "Wybierz event"),
			}),
		},
	});

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<DialogHeader>
						<DialogTitle>Dodaj nowego bohatera</DialogTitle>
						<DialogDescription>
							Utwórz nowego bohatera do wybranego eventu.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<form.Field name="name">
								{(field) => (
									<div className="grid gap-1.5">
										<Label htmlFor={field.name}>Nazwa bohatera</Label>
										<Input
											id={field.name}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="Wprowadź nazwę bohatera"
											value={field.state.value}
										/>
										{field.state.meta.errors.map((error) => (
											<p className="text-red-500 text-sm" key={error?.message}>
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>
						</div>
						<div className="grid gap-2">
							<form.Field name="image">
								{(field) => (
									<div className="grid gap-1.5">
										<Label htmlFor={field.name}>
											URL obrazka (opcjonalnie)
										</Label>
										<Input
											id={field.name}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="Wprowadź URL obrazka"
											value={field.state.value}
										/>
										{field.state.meta.errors.map((error) => (
											<p className="text-red-500 text-sm" key={error?.message}>
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>
						</div>
						<div className="grid gap-2">
							<form.Field name="eventId">
								{(field) => (
									<div className="grid gap-1.5">
										<Label htmlFor={field.name}>Event</Label>
										<Select
											onValueChange={field.handleChange}
											value={field.state.value}
										>
											<SelectTrigger id={field.name}>
												<SelectValue placeholder="Wybierz event" />
											</SelectTrigger>
											<SelectContent>
												{events.data?.map((event) => (
													<SelectItem
														key={event.id}
														value={event.id.toString()}
													>
														{event.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{field.state.meta.errors.map((error) => (
											<p className="text-red-500 text-sm" key={error?.message}>
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>
						</div>
					</div>
					<DialogFooter>
						<form.Subscribe>
							{(state) => (
								<Button
									disabled={
										!state.canSubmit || state.isSubmitting || events.isLoading
									}
									type="submit"
								>
									{state.isSubmitting ? "Tworzenie..." : "Utwórz bohatera"}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
