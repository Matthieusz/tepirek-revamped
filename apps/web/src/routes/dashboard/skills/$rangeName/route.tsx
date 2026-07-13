/* oxlint-disable no-use-before-define */

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import type { SkillSummary as SkillSummarySchema } from "@tepirek-revamped/api/protocol/skills/http-api-contract";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
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
import { AsyncResultBoundary } from "@/components/ui/async-result-boundary";
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
  const skillsResult = useAtomValue(skillsByRangeAtom(rangeId));
  const refreshSkills = useAtomRefresh(skillsByRangeAtom(rangeId));

  return (
    <AsyncResultBoundary onRetry={refreshSkills} result={skillsResult}>
      {() => <RangeSkillsContent professions={professions} rangeId={rangeId} />}
    </AsyncResultBoundary>
  );
};

const RangeSkillsContent = ({
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
  const skillsData = AsyncResult.getOrThrow(skillsResult);
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
  const professionsResult = useAtomValue(skillProfessionsAtom);
  const refreshRange = useAtomRefresh(skillRangeBySlugAtom(rangeName));
  const refreshProfessions = useAtomRefresh(skillProfessionsAtom);

  return (
    <AsyncResultBoundary onRetry={refreshRange} result={rangeResult}>
      {(rangeData) =>
        rangeData === null ? (
          <p>Nie znaleziono przedziału.</p>
        ) : (
          <AsyncResultBoundary
            onRetry={refreshProfessions}
            result={professionsResult}
          >
            {(professions) => (
              <RangeDetailsContent
                professions={professions}
                rangeData={rangeData}
              />
            )}
          </AsyncResultBoundary>
        )
      }
    </AsyncResultBoundary>
  );
};

const RangeDetailsContent = ({
  rangeData,
  professions,
}: {
  readonly rangeData: {
    readonly id: number;
    readonly level: number;
    readonly name: string;
  };
  readonly professions: readonly {
    readonly id: number;
    readonly name: string;
  }[];
}) => (
  <div className="mx-auto w-full max-w-6xl space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="mb-1 font-bold text-2xl tracking-tight">
          {rangeData.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          Zestawy umiejętności dla poziomu {rangeData.level}
        </p>
      </div>
      <AddSkillModal
        defaultRangeId={rangeData.id}
        trigger={
          <Button size="sm" type="button">
            <Plus className="size-4" />
            Dodaj zestaw
          </Button>
        }
      />
    </div>
    <RangeSkillsView professions={professions} rangeId={rangeData.id} />
  </div>
);

export const Route = createFileRoute("/dashboard/skills/$rangeName")({
  component: RangeDetails,
  loader: ({ params }) => ({ crumb: params.rangeName }),
});

type SkillToDelete = {
  id: number;
  name: string;
  rangeId: number;
} | null;
