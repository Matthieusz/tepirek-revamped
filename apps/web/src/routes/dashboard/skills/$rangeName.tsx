import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import Loader from "@/components/loader";
import { AddSkillModal } from "@/components/modals/add-skill-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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
	const professionsQuery = useQuery(
		orpc.skills.getAllProfessions.queryOptions()
	);

	const skillsByRange = useQuery(
		range.data
			? orpc.skills.getSkillsByRange.queryOptions({
					input: { rangeId: range.data.id },
				})
			: { queryKey: ["skills", rangeName, "empty"], queryFn: async () => [] }
	);

	if (range.isLoading) {
		return <Loader />;
	}

	if (!range.data) {
		return <div>Nie znaleziono przedziału.</div>;
	}

	const currentRange = range.data;

	type SkillRecord = {
		id: number;
		name: string;
		link: string;
		mastery: boolean;
		professionId: number;
		professionName: string;
		addedBy: string;
		addedByImage: string | null;
	};
	const skillsGrouped: Record<number, SkillRecord[]> = {};
	const skillsData = (skillsByRange.data || []) as SkillRecord[];
	for (const s of skillsData) {
		const key = s.professionId;
		if (!skillsGrouped[key]) {
			skillsGrouped[key] = [];
		}
		skillsGrouped[key].push(s);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center gap-4">
				<h1 className="font-bold text-3xl">{range.data.name}</h1>
				<AddSkillModal
					defaultRangeId={currentRange.id}
					trigger={
						<Button type="button" variant="default">
							<Plus />
							Dodaj zestaw umiejętności
						</Button>
					}
				/>
			</div>
			<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
				{professionsQuery.data?.map((profession) => (
					<Card className="overflow-hidden" key={profession.id}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0">
							<CardTitle className="text-base">{profession.name}</CardTitle>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-64">Nazwa zestawu</TableHead>
										<TableHead className="w-24">Link</TableHead>
										<TableHead className="w-32">Mistrzostwo?</TableHead>
										<TableHead className="w-40">Dodano przez</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{skillsGrouped[profession.id]?.map((skill) => (
										<TableRow key={skill.id}>
											<TableCell>{skill.name}</TableCell>
											<TableCell>
												<a
													className="text-primary underline"
													href={skill.link}
													rel="noopener noreferrer"
													target="_blank"
												>
													Link
												</a>
											</TableCell>
											<TableCell>{skill.mastery ? "Tak" : "Nie"}</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<Avatar className="size-6">
														<AvatarImage
															alt={skill.addedBy}
															src={skill.addedByImage || undefined}
														/>
														<AvatarFallback>
															{skill.addedBy?.slice(0, 2).toUpperCase()}
														</AvatarFallback>
													</Avatar>
													<span>{skill.addedBy}</span>
												</div>
											</TableCell>
										</TableRow>
									))}
									{!skillsGrouped[profession.id]?.length && (
										<TableRow>
											<TableCell className="text-muted-foreground" colSpan={4}>
												Brak umiejętności
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
