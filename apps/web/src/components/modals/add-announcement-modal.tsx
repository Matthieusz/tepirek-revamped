import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
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
import { orpc } from "@/utils/orpc";
import { Textarea } from "../ui/textarea";

interface AddAnnouncementModalProps {
	trigger: React.ReactNode;
}

export function AddAnnouncementModal({ trigger }: AddAnnouncementModalProps) {
	const [open, setOpen] = useState(false);
	const queryClient = useQueryClient();

	const form = useForm({
		defaultValues: {
			title: "",
			description: "",
		},
		onSubmit: async ({ value }) => {
			try {
				await orpc.announcement.create.call({
					title: value.title,
					description: value.description,
				});

				toast.success("Ogłoszenie utworzone pomyślnie");
				queryClient.invalidateQueries({
					queryKey: orpc.announcement.getAll.queryKey(),
				});
				setOpen(false);
				form.reset();
			} catch (_) {
				toast.error("Nie udało się utworzyć ogłoszenia");
			}
		},
		validators: {
			onSubmit: z.object({
				title: z.string().min(1, "Tytuł ogłoszenia jest wymagany"),
				description: z.string().min(1, "Opis ogłoszenia jest wymagany"),
			}),
		},
	});

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="sm:max-w-[600px]">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<DialogHeader>
						<DialogTitle>Dodaj nowy event</DialogTitle>
						<DialogDescription>
							Utwórz nowy event z nazwą i datą końcową.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<form.Field name="title">
								{(field) => (
									<div className="grid gap-1.5">
										<Label htmlFor={field.name}>Tytuł ogłoszenia</Label>
										<Input
											id={field.name}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="Wpisz tytuł ogłoszenia"
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
							<form.Field name="description">
								{(field) => (
									<div className="grid gap-1.5">
										<Label htmlFor={field.name}>Opis ogłoszenia</Label>
										<Textarea
											id={field.name}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="Wpisz opis ogłoszenia"
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
					</div>
					<DialogFooter>
						<form.Subscribe>
							{(state) => (
								<Button
									disabled={!state.canSubmit || state.isSubmitting}
									type="submit"
								>
									{state.isSubmitting ? "Tworzenie..." : "Dodaj ogłoszenie"}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
