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

interface AddEventModalProps {
	trigger: React.ReactNode;
}

type AddRangeModal = {
	level: number;
	image?: string;
	name: string;
};

const defaultValues: AddRangeModal = {
	level: 1,
	image: "",
	name: "",
};

export function AddRangeModal({ trigger }: AddEventModalProps) {
	const [open, setOpen] = useState(false);
	const queryClient = useQueryClient();

	const form = useForm({
		defaultValues: {
			...defaultValues,
		},
		onSubmit: async ({ value }) => {
			try {
				await orpc.skills.createRange.call({
					level: value.level,
					image: value.image || "",
					name: value.name,
				});

				toast.success("Przedział utworzony pomyślnie");
				queryClient.invalidateQueries({
					queryKey: orpc.skills.getAllRanges.queryKey(),
				});
				setOpen(false);
				form.reset();
			} catch (_) {
				toast.error("Nie udało się utworzyć przedziału");
			}
		},
		validators: {
			onSubmit: z.object({
				level: z.number().min(1, "Poziom jest wymagany"),
				image: z.string().min(2),
				name: z.string().min(1, "Nazwa jest wymagana"),
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
						<DialogTitle>Dodaj nowy przedział</DialogTitle>
						<DialogDescription>
							Utwórz nowy przedział z nazwą i poziomem.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<form.Field name="name">
								{(field) => (
									<div className="grid gap-1.5">
										<Label htmlFor={field.name}>Nazwa przedziału</Label>
										<Input
											id={field.name}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="Wpisz nazwę przedziału"
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
							<form.Field name="level">
								{(field) => (
									<div className="grid gap-1.5">
										<Label htmlFor={field.name}>Level</Label>
										<Input
											id={field.name}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={(e) =>
												field.handleChange(
													Number.parseInt(e.target.value, 10) || 0
												)
											}
											placeholder="Wpisz level"
											type="number"
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
										<Label htmlFor={field.name}>URL obrazka</Label>
										<Input
											id={field.name}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="Wpisz URL obrazka"
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
									{state.isSubmitting ? "Tworzenie..." : "Utwórz przedział"}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
