import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PreviewAccountRefetchSuccess } from "@tepirek-revamped/api/protocol/squad-builder/account-refetch/account-refetch-schema";
import { CheckCircle2, CircleAlert, Loader2, RotateCw } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { invalidateAccountResources } from "@/features/squad-builder/account-queries";
import {
  previewAccountRefetch,
  applyAccountRefetch,
} from "@/features/squad-builder/account-refetch-api";
import { getErrorMessage } from "@/lib/errors";
import { runAppHttpApi } from "@/lib/http-api-client-runtime";

import { changeFieldLabel, formatChangeValue } from "./account-presenters";

interface Account {
  readonly accountId: number;
  readonly displayName: string;
}

type PreviewResult =
  | {
      readonly account: Account;
      readonly status: "ready";
      readonly preview: PreviewAccountRefetchSuccess;
    }
  | {
      readonly account: Account;
      readonly status: "failed";
      readonly message: string;
    };

interface ApplyResult {
  readonly account: Account;
  readonly message: string;
  readonly status: "success" | "failed";
}

/** Previews all owned accounts sequentially and applies only explicitly confirmed previews. */
export const BulkAccountRefetchWorkflow = ({
  accounts,
  runner = runAppHttpApi,
}: {
  readonly accounts: readonly Account[];
  readonly runner?: typeof runAppHttpApi;
}) => {
  const queryClient = useQueryClient();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [previews, setPreviews] = useState<readonly PreviewResult[]>([]);
  const [results, setResults] = useState<readonly ApplyResult[] | null>(null);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);

  const previewMutation = useMutation({
    mutationFn: async (snapshot: readonly Account[]) => {
      const collected: PreviewResult[] = [];

      const previewNext = async (index: number): Promise<void> => {
        const account = snapshot[index];

        if (account === undefined) {
          return;
        }

        try {
          const preview = await runner(
            previewAccountRefetch({ accountId: account.accountId })
          );

          collected.push({ account, preview, status: "ready" });
        } catch (error) {
          collected.push({
            account,
            message: getErrorMessage(
              error,
              "Nie udało się przygotować odświeżenia."
            ),
            status: "failed",
          });
        }

        setCompleted(collected.length);
        await previewNext(index + 1);
      };

      await previewNext(0);

      return collected;
    },
    onSuccess: setPreviews,
    retry: false,
  });

  const applyMutation = useMutation({
    mutationFn: async (snapshot: readonly PreviewResult[]) => {
      const collected: ApplyResult[] = [];

      const applyNext = async (index: number): Promise<void> => {
        const entry = snapshot[index];

        if (entry === undefined) {
          return;
        }

        if (entry.status === "ready") {
          try {
            const response = await runner(
              applyAccountRefetch({
                refetchPreviewId: entry.preview.refetchPreviewId,
              })
            );

            collected.push({
              account: entry.account,
              message: `Odświeżono. Usunięte wpisy ze składów: ${response.removedSquadCharacterCount}.`,
              status: "success",
            });
          } catch (error) {
            collected.push({
              account: entry.account,
              message: getErrorMessage(
                error,
                "Nie udało się zastosować zmian."
              ),
              status: "failed",
            });
          }

          setCompleted(collected.length);
        }

        await applyNext(index + 1);
      };

      await applyNext(0);

      return collected;
    },
    onSettled: async () => {
      await invalidateAccountResources(queryClient);
    },
    onSuccess: setResults,
    retry: false,
  });

  const busy = previewMutation.isPending || applyMutation.isPending;

  const readyCount = previews.filter(
    (entry) => entry.status === "ready"
  ).length;

  return (
    <>
      <Button
        ref={buttonRef}
        variant="outline"
        disabled={accounts.length === 0 || busy || open}
        onClick={() => {
          setPreviews([]);
          setResults(null);
          setCompleted(0);
          setTotal(accounts.length);
          setOpen(true);
          previewMutation.mutate([...accounts]);
        }}
      >
        {busy ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <RotateCw aria-hidden="true" className="size-4" />
        )}
        Odśwież wszystkie
      </Button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!busy) {
            setOpen(nextOpen);
          }
        }}
      >
        <DialogContent
          finalFocus={buttonRef}
          className="flex max-h-[85dvh] flex-col overflow-hidden sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle>Odśwież wszystkie konta</DialogTitle>
            <DialogDescription>
              Sprawdź zmiany przed zastosowaniem. Usunięte postacie zostaną
              również usunięte z zapisanych składów.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain">
            {busy && (
              <output>
                {previewMutation.isPending ? "Sprawdzono" : "Zastosowano"}{" "}
                {completed} z {total} kont
              </output>
            )}
            {previews.map((entry) => (
              <section
                key={entry.account.accountId}
                className={
                  entry.status === "failed"
                    ? "border-destructive/30 bg-destructive/5 space-y-3 rounded-lg border p-3"
                    : "border-primary/20 bg-primary/5 space-y-3 rounded-lg border p-3"
                }
              >
                <h3 className="font-medium">{entry.account.displayName}</h3>
                {entry.status === "failed" ? (
                  <p className="text-destructive text-sm" role="alert">
                    {entry.message}
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                      <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-400">
                        Dodane: {entry.preview.diff.added.length}
                      </span>
                      <span className="bg-destructive/10 text-destructive rounded-md px-2 py-1">
                        Usunięte: {entry.preview.diff.removed.length}
                      </span>
                      <span className="rounded-md bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-400">
                        Zmienione: {entry.preview.diff.changed.length}
                      </span>
                      <span className="bg-muted text-muted-foreground rounded-md px-2 py-1">
                        Bez zmian: {entry.preview.diff.unchangedCount}
                      </span>
                    </div>
                    <ul className="space-y-1 text-sm">
                      {entry.preview.diff.added.map(({ latest }) => (
                        <li key={`added-${latest.characterId}`}>
                          Dodana: {latest.name} ({latest.level})
                        </li>
                      ))}
                      {entry.preview.diff.removed.map(({ current }) => (
                        <li key={`removed-${current.databaseCharacterId}`}>
                          Usunięta: {current.name} — dotknięte składy:{" "}
                          {current.affectedSquadCount}
                        </li>
                      ))}
                      {entry.preview.diff.changed.map((character) => (
                        <li key={`changed-${character.databaseCharacterId}`}>
                          {character.latest.name}:{" "}
                          {character.changes
                            .map(
                              (change) =>
                                `${changeFieldLabel(change.field)}: ${formatChangeValue(change.before)} → ${formatChangeValue(change.after)}`
                            )
                            .join(", ")}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            ))}
            {results !== null && (
              <section
                className="bg-muted/30 space-y-3 rounded-lg border p-3"
                aria-live="polite"
              >
                <h3 className="font-medium">Wyniki odświeżenia</h3>
                <ul className="space-y-2 text-sm">
                  {results.map((result) => (
                    <li
                      key={result.account.accountId}
                      className="flex items-start gap-2"
                    >
                      {result.status === "success" ? (
                        <CheckCircle2
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-400"
                        />
                      ) : (
                        <CircleAlert
                          aria-hidden="true"
                          className="text-destructive mt-0.5 size-4 shrink-0"
                        />
                      )}
                      <span>
                        <span className="font-medium">
                          {result.account.displayName}
                        </span>
                        : {result.message}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {results === null && (
              <Button
                disabled={busy || readyCount === 0}
                onClick={() => {
                  setCompleted(0);
                  setTotal(readyCount);
                  applyMutation.mutate(previews);
                }}
              >
                Zastosuj zmiany ({readyCount})
              </Button>
            )}
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setOpen(false);
              }}
            >
              {results === null ? "Anuluj" : "Zamknij"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
