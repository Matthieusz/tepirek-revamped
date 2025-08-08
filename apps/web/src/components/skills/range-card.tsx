import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { cn, slugify } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

interface RangeCardProps {
	range: {
		id: number;
		name: string;
		level: number;
		image: string | null;
	};
	className?: string;
}

export function RangeCard({ range, className }: RangeCardProps) {
	const { data: session } = authClient.useSession();
	const queryClient = useQueryClient();

	return (
		<Card className={cn("relative", className)}>
			<Link
				className="flex flex-col no-underline focus:outline-none"
				params={{ rangeName: slugify(range.name) }}
				to="/dashboard/skills/$rangeName"
			>
				<CardHeader className="mb-4">
					<CardTitle className="flex items-center gap-2">
						<span>{range.name}</span>
					</CardTitle>
					<CardDescription>Level: {range.level}</CardDescription>
				</CardHeader>
				{range.image && (
					<CardContent className="flex flex-col items-center">
						<img
							alt={range.name}
							className="h-36 rounded-md object-fit"
							src={range.image}
						/>
					</CardContent>
				)}
			</Link>
			{session?.user.role === "admin" && (
				<div className="px-6">
					<Button
						className="w-full"
						onClick={() => {
							if (
								window.confirm(
									`Czy na pewno chcesz usunąć przedział "${range.name}"?`
								)
							) {
								orpc.skills.deleteRange.call({ id: range.id }).then(() => {
									queryClient.invalidateQueries({
										queryKey: orpc.skills.getAllRanges.queryKey(),
									});
								});
							}
						}}
						size="default"
						type="button"
						variant="destructive"
					>
						<Trash2 className="h-4 w-4" />
						Usuń przedział
					</Button>
				</div>
			)}
		</Card>
	);
}
