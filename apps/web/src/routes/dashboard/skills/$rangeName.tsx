import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AddSkillModal } from "@/components/modals/add-skill-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isAdmin } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/skills/$rangeName")({
  component: RangeDetails,
  loader: async ({ params }) => {
    const slug = params.rangeName;
    try {
      const data = await orpc.skills.getRangeBySlug.call({ slug });
      return { crumb: `${data?.name ?? slug}` };
    } catch {
      return { crumb: `${slug}` };
    }
  },
});

type SkillToDelete = {
  id: number;
  name: string;
  rangeId: number;
} | null;

/* oxlint-disable react/no-array-index-key -- skeleton placeholders have no unique identifiers */
const SkillsLoadingSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={`skill-skeleton-${i.toString()}`}>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="pt-0">
          <TableSkeleton columns={3} rows={3} />
        </CardContent>
      </Card>
    ))}
  </div>
);
/* oxlint-enable react/no-array-index-key */

const RangeDetails = () => {
  const { rangeName } = Route.useParams();
  const { session } = Route.useRouteContext();
  const [skillToDelete, setSkillToDelete] = useState<SkillToDelete>(null);

  const isAdminUser = isAdmin(session);

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
      : { queryFn: () => [], queryKey: ["skills", rangeName, "empty"] }
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await orpc.skills.deleteSkill.call({ id });
    },
    onError: () => {
      toast.error("Błąd podczas usuwania");
    },
    onSuccess: () => {
      toast.success("Usunięto zestaw");
      if (skillToDelete?.rangeId) {
        queryClient.invalidateQueries({
          queryKey: orpc.skills.getSkillsByRange.queryKey({
            input: { rangeId: skillToDelete.rangeId },
          }),
        });
      }
      setSkillToDelete(null);
    },
  });

  if (range.isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="mb-1 h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <SkillsLoadingSkeleton />
      </div>
    );
  }

  if (!range.data) {
    return <div>Nie znaleziono przedziału.</div>;
  }

  const currentRange = range.data;

  const skillsData = skillsByRange.data ?? [];
  const skillsGrouped: Record<number, typeof skillsData> = {};
  for (const s of skillsData) {
    const key = s.professionId;
    if (!skillsGrouped[key]) {
      skillsGrouped[key] = [];
    }
    skillsGrouped[key].push(s);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-1 font-bold text-2xl tracking-tight">
            {range.data.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            Zestawy umiejętności dla poziomu {currentRange.level}
          </p>
        </div>
        <AddSkillModal
          defaultRangeId={currentRange.id}
          trigger={
            <Button size="sm" type="button">
              <Plus className="h-4 w-4" />
              Dodaj zestaw
            </Button>
          }
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {professionsQuery.data?.map((profession) => {
          const skills = skillsGrouped[profession.id] ?? [];
          return (
            <Card key={profession.id}>
              <CardHeader className="pb-3">
                <CardTitle className="font-medium text-sm">
                  {profession.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {skills.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Link</TableHead>
                          <TableHead className="w-20">Mistrz</TableHead>
                          <TableHead className="w-28">Autor</TableHead>
                          {isAdminUser && <TableHead className="w-16" />}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {skills.map((skill) => (
                          <TableRow key={skill.id}>
                            <TableCell>
                              <a
                                className="text-primary hover:underline"
                                href={skill.link}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                {skill.name}
                              </a>
                            </TableCell>
                            <TableCell>
                              <span
                                className={
                                  skill.mastery
                                    ? "text-green-500"
                                    : "text-muted-foreground"
                                }
                              >
                                {skill.mastery ? "Tak" : "Nie"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Avatar className="size-5">
                                  <AvatarImage
                                    alt={skill.addedBy}
                                    src={skill.addedByImage || undefined}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {skill.addedBy?.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate text-xs">
                                  {skill.addedBy}
                                </span>
                              </div>
                            </TableCell>
                            {isAdminUser && (
                              <TableCell>
                                <Button
                                  onClick={() =>
                                    setSkillToDelete({
                                      id: skill.id,
                                      name: skill.name,
                                      rangeId: currentRange.id,
                                    })
                                  }
                                  size="sm"
                                  type="button"
                                  variant="ghost"
                                >
                                  Usuń
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>{" "}
                  </div>
                ) : (
                  <p className="py-4 text-center text-muted-foreground text-sm">
                    Brak zestawów
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog
        onOpenChange={(open) => !open && setSkillToDelete(null)}
        open={skillToDelete !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć ten zestaw?</AlertDialogTitle>
            <AlertDialogDescription>
              Zestaw &quot;{skillToDelete?.name}&quot; zostanie trwale usunięty.
              Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() =>
                skillToDelete && deleteMutation.mutate(skillToDelete.id)
              }
            >
              {deleteMutation.isPending ? "Usuwanie..." : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
