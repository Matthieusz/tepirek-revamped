import { useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import type { SkillSummary as SkillSummarySchema } from "@tepirek-revamped/api/protocol/skills/http-api-contract";
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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resultIsLoading, resultValueOr } from "@/lib/effect-atom-result";
import { isAdmin } from "@/lib/route-helpers";
import {
  deleteSkillFromRangeAtom,
  skillProfessionsAtom,
  skillRangeBySlugAtom,
  skillsByRangeAtom,
} from "@/lib/skill-atoms";

const routeApi = getRouteApi("/dashboard/skills/$rangeName");

const RangeSkillsView = ({
  rangeId,
  professions,
}: {
  rangeId: number;
  professions: readonly { readonly id: number; readonly name: string }[];
}) => {
  const { session } = routeApi.useRouteContext();
  const isAdminUser = isAdmin(session);
  const [skillToDelete, setSkillToDelete] = useState<SkillToDelete>(null);

  const skillsResult = useAtomValue(skillsByRangeAtom(rangeId));
  const deleteSkill = useAtomSet(deleteSkillFromRangeAtom(rangeId), {
    mode: "promise",
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteMutation = {
    isPending: isDeleting,
    mutate: (id: number) => {
      void (async () => {
        setIsDeleting(true);
        try {
          await deleteSkill({ id });
          toast.success("Usunięto zestaw");
          setSkillToDelete(null);
        } catch {
          toast.error("Błąd podczas usuwania");
        } finally {
          setIsDeleting(false);
        }
      })();
    },
  };

  const skillsData = resultValueOr(skillsResult, []) ?? [];
  type SkillSummary = typeof SkillSummarySchema.Type;
  const skillsGrouped: Record<number, SkillSummary[]> = {};
  for (const s of skillsData) {
    const key = s.professionId;
    skillsGrouped[key] ??= [];
    skillsGrouped[key].push(s);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {professions.map((profession) => {
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
                                  alt={skill.addedBy ?? ""}
                                  src={skill.addedByImage ?? undefined}
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
                                onClick={() => {
                                  setSkillToDelete({
                                    id: skill.id,
                                    name: skill.name,
                                    rangeId,
                                  });
                                }}
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

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setSkillToDelete(null);
          }
        }}
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
              onClick={() => {
                if (skillToDelete) {
                  deleteMutation.mutate(skillToDelete.id);
                }
              }}
            >
              {deleteMutation.isPending ? "Usuwanie..." : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const RangeDetails = () => {
  const { rangeName } = routeApi.useParams();
  const rangeResult = useAtomValue(skillRangeBySlugAtom(rangeName));
  const rangeData = resultValueOr(rangeResult, null);
  const rangeIsLoading = resultIsLoading(rangeResult);
  const professionsQueryData = resultValueOr(
    useAtomValue(skillProfessionsAtom),
    []
  );

  if (rangeIsLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (!rangeData) {
    return <div>Nie znaleziono przedziału.</div>;
  }

  const currentRange = rangeData;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-1 font-bold text-2xl tracking-tight">
            {rangeData.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            Zestawy umiejętności dla poziomu {currentRange.level}
          </p>
        </div>
        <AddSkillModal
          defaultRangeId={currentRange.id}
          trigger={
            <Button size="sm" type="button">
              <Plus className="size-4" />
              Dodaj zestaw
            </Button>
          }
        />
      </div>
      <RangeSkillsView
        professions={professionsQueryData}
        rangeId={currentRange.id}
      />
    </div>
  );
};

export const Route = createFileRoute("/dashboard/skills/$rangeName")({
  component: RangeDetails,
  loader: ({ params }) => ({ crumb: params.rangeName }),
});

type SkillToDelete = {
  id: number;
  name: string;
  rangeId: number;
} | null;
