import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import * as Arr from "effect/Array";
import { useState } from "react";
import { toast } from "sonner";

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
import { QueryErrorState } from "@/components/ui/query-error-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  Skill,
  SkillProfession,
  SkillRange,
} from "@/features/skills/skill-api";
import {
  deleteSkillMutationOptions,
  skillProfessionsQueryOptions,
  skillRangeBySlugQueryOptions,
  skillsByRangeQueryOptions,
} from "@/features/skills/skill-queries";
import { getErrorMessage } from "@/lib/errors";
import { isAdmin } from "@/lib/route-helpers";
import { AddSkillModal } from "@/routes/dashboard/skills/$rangeName/-components/add-skill-modal";

const routeApi = getRouteApi("/dashboard/skills/$rangeName");

type SkillToDelete = {
  id: number;
  name: string;
  rangeId: number;
} | null;

const RangeSkillsView = ({
  rangeId,
  professions,
}: {
  readonly rangeId: number;
  readonly professions: readonly SkillProfession[];
}) => {
  const skillsQuery = useQuery(skillsByRangeQueryOptions(rangeId));

  if (skillsQuery.isPending) {
    return <LoadingSpinner />;
  }

  if (skillsQuery.isError && skillsQuery.data === undefined) {
    return (
      <QueryErrorState
        message={getErrorMessage(
          skillsQuery.error,
          "Nie udało się wczytać zestawów. Spróbuj ponownie."
        )}
        onRetry={() => {
          void skillsQuery.refetch();
        }}
      />
    );
  }

  return (
    // oxlint-disable-next-line no-use-before-define -- the query boundary keeps resource lifecycle separate from content UI
    <RangeSkillsContent
      isRefreshing={skillsQuery.isFetching}
      onRetry={() => {
        void skillsQuery.refetch();
      }}
      professions={professions}
      rangeId={rangeId}
      refreshError={skillsQuery.isError ? skillsQuery.error : undefined}
      skills={skillsQuery.data ?? []}
    />
  );
};

const RangeSkillsContent = ({
  isRefreshing,
  onRetry,
  professions,
  rangeId,
  refreshError,
  skills,
}: {
  readonly isRefreshing: boolean;
  readonly onRetry: () => void;
  readonly professions: readonly SkillProfession[];
  readonly rangeId: number;
  readonly refreshError: unknown;
  readonly skills: readonly Skill[];
}) => {
  const { session } = routeApi.useRouteContext();
  const isAdminUser = isAdmin(session);
  const [skillToDelete, setSkillToDelete] = useState<SkillToDelete>(null);
  const queryClient = useQueryClient();
  const deleteSkill = useMutation(
    deleteSkillMutationOptions(queryClient, undefined, {
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
      onRefreshError: (error) => {
        toast.error(
          getErrorMessage(error, "Nie udało się odświeżyć zestawów.")
        );
      },
    })
  );
  const isDeleting = deleteSkill.isPending;

  const skillsGrouped = Arr.groupBy(skills, (skill) =>
    String(skill.professionId)
  );

  const deleteSkillById = (id: number) => {
    void (async () => {
      try {
        await deleteSkill.mutateAsync(id);
        toast.success("Usunięto zestaw");
        setSkillToDelete(null);
      } catch {
        // The mutation callback already reports the error to the user.
      }
    })();
  };

  return (
    <div className="space-y-3">
      {isRefreshing && (
        <p
          aria-live="polite"
          className="text-muted-foreground text-center text-xs"
        >
          Odświeżanie…
        </p>
      )}
      {refreshError !== undefined && (
        <div
          aria-live="assertive"
          className="border-destructive/30 bg-destructive/5 flex items-center justify-between gap-3 rounded-xl border p-3"
          role="alert"
        >
          <p className="text-destructive text-sm">
            {getErrorMessage(refreshError, "Nie udało się odświeżyć zestawów.")}
          </p>
          <Button onClick={onRetry} size="sm" variant="outline">
            Spróbuj ponownie
          </Button>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {professions.map((profession) => {
          const professionSkills = skillsGrouped[String(profession.id)] ?? [];
          return (
            <Card key={profession.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  {profession.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {professionSkills.length > 0 ? (
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
                        {professionSkills.map((skill) => (
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
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    Brak zestawów
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

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
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() => {
                if (skillToDelete) {
                  deleteSkillById(skillToDelete.id);
                }
              }}
            >
              {isDeleting ? "Usuwanie..." : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const RangeDetailsContent = ({
  rangeData,
  professions,
}: {
  readonly rangeData: SkillRange;
  readonly professions: readonly SkillProfession[];
}) => (
  <div className="mx-auto w-full max-w-6xl space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="mb-1 text-2xl font-bold tracking-tight">
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
            <HugeiconsIcon
              aria-hidden="true"
              icon={Add01Icon}
              className="size-4"
            />
            Dodaj zestaw
          </Button>
        }
      />
    </div>
    <RangeSkillsView professions={professions} rangeId={rangeData.id} />
  </div>
);

/** Renders the skill range page and its asynchronous resources. */
export const RangeDetails = () => {
  const { rangeName } = routeApi.useParams();
  const rangeQuery = useQuery(skillRangeBySlugQueryOptions(rangeName));
  const professionsQuery = useQuery(skillProfessionsQueryOptions());

  if (rangeQuery.isPending || professionsQuery.isPending) {
    return <LoadingSpinner />;
  }

  if (rangeQuery.isError && rangeQuery.data === undefined) {
    return (
      <QueryErrorState
        message={getErrorMessage(
          rangeQuery.error,
          "Nie udało się wczytać przedziału. Spróbuj ponownie."
        )}
        onRetry={() => {
          void rangeQuery.refetch();
        }}
      />
    );
  }

  if (rangeQuery.data === null) {
    return (
      <output className="text-muted-foreground block py-8 text-center">
        Nie znaleziono przedziału.
      </output>
    );
  }

  if (professionsQuery.isError && professionsQuery.data === undefined) {
    return (
      <QueryErrorState
        message={getErrorMessage(
          professionsQuery.error,
          "Nie udało się wczytać profesji. Spróbuj ponownie."
        )}
        onRetry={() => {
          void professionsQuery.refetch();
        }}
      />
    );
  }

  return (
    <RangeDetailsContent
      professions={professionsQuery.data ?? []}
      rangeData={rangeQuery.data}
    />
  );
};
