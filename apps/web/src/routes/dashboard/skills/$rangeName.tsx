import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import Loader from "@/components/loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/skills/$rangeName")({
	loader: async ({ params }) => {
		const slug = params.rangeName;
		try {
			const data = await orpc.skills.getRangeBySlug.call({ slug });
			return { crumb: `${data?.name ?? slug}` };
		} catch {
			return { crumb: `${slug}` };
		}
	},
	component: RangeDetails,
});

function RangeDetails() {
	const { rangeName } = Route.useParams();
	const range = useQuery(
		orpc.skills.getRangeBySlug.queryOptions({ input: { slug: rangeName } })
	);

	if (range.isLoading) {
		return <Loader />;
	}

	if (!range.data) {
		return <div>Nie znaleziono przedziału.</div>;
	}

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader>
					<CardTitle>{range.data.name}</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col items-center gap-4">
					{range.data.image && (
						<img
							alt={range.data.name}
							className="h-64 w-full max-w-md rounded-md object-cover"
							src={range.data.image}
						/>
					)}
					<p className="text-muted-foreground text-sm">
						Level: {range.data.level}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
