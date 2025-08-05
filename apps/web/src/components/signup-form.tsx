import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import Loader from "./loader";

export function SignUpForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const navigate = useNavigate({
		from: "/",
	});
	const { isPending } = authClient.useSession();

	const form = useForm({
		defaultValues: {
			name: "",
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signUp.email(
				{
					name: value.name,
					email: value.email,
					password: value.password,
				},
				{
					onSuccess: () => {
						navigate({
							to: "/dashboard",
						});
						toast.success("Sign up successful");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				}
			);
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "Name must be at least 2 characters"),
				email: z.email("Invalid email address"),
				password: z.string().min(8, "Password must be at least 8 characters"),
			}),
		},
	});

	if (isPending) {
		return (
			<div className="h-screen">
				<Loader />
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle>Login to your account</CardTitle>
					<CardDescription>
						Enter your email below to login to your account
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
					>
						<div className="flex flex-col gap-6">
							<div>
								<form.Field name="name">
									{(field) => (
										<div className="grid gap-3">
											<Label htmlFor={field.name}>Name</Label>
											<Input
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="John Doe"
												required
												type="text"
												value={field.state.value}
											/>
											{field.state.meta.errors.map((error) => (
												<p
													className="text-red-500 text-sm"
													key={error?.message}
												>
													{error?.message}
												</p>
											))}
										</div>
									)}
								</form.Field>
							</div>
							<div>
								<form.Field name="email">
									{(field) => (
										<div className="grid gap-3">
											<Label htmlFor={field.name}>Email</Label>
											<Input
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="m@example.com"
												required
												type="email"
												value={field.state.value}
											/>
											{field.state.meta.errors.map((error) => (
												<p
													className="text-red-500 text-sm"
													key={error?.message}
												>
													{error?.message}
												</p>
											))}
										</div>
									)}
								</form.Field>
							</div>
							<div>
								<form.Field name="password">
									{(field) => (
										<div className="grid gap-3">
											<Label htmlFor={field.name}>Password</Label>
											<Input
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												required
												type="password"
												value={field.state.value}
											/>
											{field.state.meta.errors.map((error) => (
												<p
													className="text-red-500 text-sm"
													key={error?.message}
												>
													{error?.message}
												</p>
											))}
										</div>
									)}
								</form.Field>
							</div>
							<div className="flex flex-col gap-2">
								<form.Subscribe>
									{(state) => (
										<Button
											className="w-full"
											disabled={!state.canSubmit || state.isSubmitting}
											type="submit"
										>
											{state.isSubmitting ? "Submitting..." : "Sign Up"}
										</Button>
									)}
								</form.Subscribe>
								<Button
									className="w-full"
									onClick={async () => {
										await authClient.signIn.social({
											provider: "discord",
											fetchOptions: {
												onSuccess: () => {
													navigate({
														to: "/dashboard",
													});
													toast.success("Login successful");
												},
												onError: (error) => {
													toast.error(
														error.error.message || error.error.statusText
													);
												},
											},
										});
									}}
									variant="outline"
								>
									Login with Discord
								</Button>
							</div>
						</div>
						<div className="mt-4 text-center text-sm">
							Already have an account?{" "}
							<Link
								className="text-primary underline underline-offset-4"
								to={"/login"}
							>
								Login
							</Link>
						</div>
					</form>
				</CardContent>
			</Card>
			<Button variant={"ghost"}>
				<Link className="flex items-center gap-2" to={"/"}>
					<ArrowLeft />
					Go back to home
				</Link>
			</Button>
		</div>
	);
}
