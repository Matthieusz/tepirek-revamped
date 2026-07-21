import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { OwnedMargonemAccountSummarySchema } from "@tepirek-revamped/api/protocol/squad-builder/account-import/account-import-schema";
import type { PreviewAccountRefetchSuccess } from "@tepirek-revamped/api/protocol/squad-builder/account-refetch/account-refetch-schema";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Link2,
  Loader2,
  Pencil,
  RotateCw,
  Save,
  Share2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EffectForm, EffectFormFeedback } from "@/components/forms/effect-form";
import { EffectTextField } from "@/components/forms/effect-form-fields";
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Badge as ReuiBadge } from "@/components/reui/badge";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/reui/data-grid/data-grid";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import {
  Frame,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame";
import { IconStack } from "@/components/reui/icon-stack";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { AccountDisplayNameSchema } from "@/lib/form-schemas";
import { formSubmission } from "@/lib/form-submission";
import {
  deleteOwnedAccountAtom,
  updateOwnedAccountDisplayNameAtom,
} from "@/lib/squad-builder/account-import-atoms";
import {
  applyAccountRefetchAtom,
  previewAccountRefetchAtom,
} from "@/lib/squad-builder/account-refetch-atoms";
import { formatDateTime } from "@/lib/utils";
import {
  changeFieldLabel,
  formatChangeValue,
  formatProfession,
} from "@/pages/dashboard/squad-builder/accounts/account-presenters";
import { AccountSharingPanel } from "@/pages/dashboard/squad-builder/accounts/account-sharing-panel";
import { MargonemCharacterAvatarImage } from "@/pages/dashboard/squad-builder/margonem-character-avatar-image";
import { getProfessionPresentation } from "@/pages/dashboard/squad-builder/profession-presenters";

type OwnedAccount = OwnedMargonemAccountSummarySchema;

type RenameAccount = (displayName: string) => Promise<unknown>;

interface RenameAccountSubmitArgs {
  readonly renameAccount: RenameAccount;
}

const accountRenameFormBuilder = FormBuilder.empty.addField(
  "displayName",
  AccountDisplayNameSchema
);

const makeAccountRenameForm = () =>
  FormReact.make(accountRenameFormBuilder, {
    fields: { displayName: EffectTextField },
    mode: { validation: "onSubmit" },
    onSubmit: ({ renameAccount }: RenameAccountSubmitArgs, { decoded }) =>
      formSubmission(() => renameAccount(decoded.displayName.trim())),
  });

interface AccountRefetchPreview {
  readonly refetchPreviewId: number;
  readonly diff: {
    readonly added: readonly {
      readonly characterId: number;
      readonly name: string;
      readonly level: number;
      readonly profession: string;
      readonly avatarUrl: string | null;
    }[];
    readonly removed: readonly {
      readonly databaseCharacterId: number;
      readonly characterId: number;
      readonly name: string;
      readonly level: number;
      readonly profession: string;
      readonly avatarUrl: string | null;
      readonly affectedSquadCount: number;
    }[];
    readonly changed: readonly {
      readonly databaseCharacterId: number;
      readonly characterId: number;
      readonly name: string;
      readonly changes: readonly {
        readonly field: "name" | "level" | "profession" | "avatarUrl";
        readonly before: string | number | null;
        readonly after: string | number | null;
      }[];
    }[];
    readonly unchangedCount: number;
  };
}

type AccountRefetchPreviewApi = PreviewAccountRefetchSuccess;

interface OwnedAccountRowProps {
  readonly account: OwnedAccount;
}

const toAccountRefetchPreview = (
  preview: AccountRefetchPreviewApi
): AccountRefetchPreview => ({
  diff: {
    added: preview.diff.added.map(({ latest }) => ({
      avatarUrl: latest.avatarUrl,
      characterId: latest.characterId,
      level: latest.level,
      name: latest.name,
      profession: latest.profession,
    })),
    changed: preview.diff.changed.map((character) => ({
      changes: character.changes,
      characterId: character.margonemCharacterId,
      databaseCharacterId: character.databaseCharacterId,
      name: character.latest.name,
    })),
    removed: preview.diff.removed.map(({ current }) => ({
      affectedSquadCount: current.affectedSquadCount,
      avatarUrl: current.avatarUrl,
      characterId: current.margonemCharacterId,
      databaseCharacterId: current.databaseCharacterId,
      level: current.level,
      name: current.name,
      profession: current.profession,
    })),
    unchangedCount: preview.diff.unchangedCount,
  },
  refetchPreviewId: preview.refetchPreviewId,
});

interface RenameAccountFormProps {
  readonly account: OwnedAccount;
  readonly onCancel: () => void;
  readonly onSuccess: () => void;
}

const RenameAccountForm = ({
  account,
  onCancel,
  onSuccess,
}: RenameAccountFormProps) => {
  const renameForm = useMemo(makeAccountRenameForm, []);
  const submit = useAtomSet(renameForm.submit);
  const reset = useAtomSet(renameForm.reset);
  const submitResult = useAtomValue(renameForm.submit);
  const updateAccount = useAtomSet(updateOwnedAccountDisplayNameAtom, {
    mode: "promise",
  });
  const isSubmitting = submitResult.waiting;

  return (
    <renameForm.Initialize defaultValues={{ displayName: account.displayName }}>
      <EffectForm
        action={() =>
          submit({
            renameAccount: async (displayName) => {
              const result = await updateAccount({
                accountId: account.accountId,
                displayName,
              });
              reset();
              onSuccess();
              return result;
            },
          })
        }
        className="space-y-2"
        submitResult={submitResult}
      >
        <renameForm.displayName
          disabled={isSubmitting}
          id={`rename-account-${account.accountId}`}
          label="Nazwa konta"
          maxLength={80}
        />
        <EffectFormFeedback result={submitResult} />
        <div className="flex flex-wrap gap-2">
          <Button disabled={isSubmitting} size="sm" type="submit">
            {isSubmitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Zapisz
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={onCancel}
            size="sm"
            type="button"
            variant="ghost"
          >
            <X className="size-3.5" />
            Anuluj
          </Button>
        </div>
      </EffectForm>
    </renameForm.Initialize>
  );
};

interface DeleteAccountDialogProps {
  readonly account: OwnedAccount;
  readonly onDeleted: () => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}

const DeleteAccountDialog = ({
  account,
  onDeleted,
  onOpenChange,
  open,
}: DeleteAccountDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteAccount = useAtomSet(deleteOwnedAccountAtom, {
    mode: "promise",
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAccount({ accountId: account.accountId });
      onOpenChange(false);
      onDeleted();
      toast.success(
        result.removedSquadCharacterCount > 0
          ? `Konto usunięte. Usunięto ${result.removedSquadCharacterCount} wpisów ze składów.`
          : "Konto zostało usunięte."
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Nie udało się usunąć konta"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Usunąć konto „{account.displayName}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Ta operacja jest nieodwracalna. Konto, jego postacie, zapisane
            przydziały w składach oraz udostępnienia zostaną usunięte
            transakcyjnie.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={() => void handleDelete()}
            variant="destructive"
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Usuń konto
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const OwnedAccountCharacterPreview = ({
  account,
}: {
  readonly account: OwnedAccount;
}) => {
  const [character] = account.characterPreviews;

  if (character === undefined) {
    return null;
  }

  const profession = getProfessionPresentation(character.profession);
  const ProfessionIcon = profession.icon;

  return (
    <div className="flex shrink-0 items-center">
      <span className="sr-only">Postać konta: {character.name}</span>
      <Avatar className="h-10 w-8 overflow-hidden rounded-none after:hidden">
        {character.avatarUrl ? (
          <MargonemCharacterAvatarImage alt="" src={character.avatarUrl} />
        ) : null}
        <AvatarFallback className="rounded-none">
          <ProfessionIcon
            aria-hidden="true"
            className={`size-3.5 ${profession.colorClass}`}
          />
        </AvatarFallback>
      </Avatar>
    </div>
  );
};

const OwnedAccountRow = ({ account }: OwnedAccountRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPreviewingRefetch, setIsPreviewingRefetch] = useState(false);
  const [isApplyingRefetch, setIsApplyingRefetch] = useState(false);
  const [refetchPreview, setRefetchPreview] =
    useState<AccountRefetchPreview | null>(null);
  const previewRefetch = useAtomSet(previewAccountRefetchAtom, {
    mode: "promise",
  });
  const applyRefetch = useAtomSet(applyAccountRefetchAtom, {
    mode: "promise",
  });

  const hasDiff =
    refetchPreview !== null &&
    (refetchPreview.diff.added.length > 0 ||
      refetchPreview.diff.removed.length > 0 ||
      refetchPreview.diff.changed.length > 0);

  return (
    <div className="grid gap-6 px-5 py-4 lg:grid-cols-2">
      <div className="min-w-0">
        {isEditing ? (
          <RenameAccountForm
            account={account}
            onCancel={() => setIsEditing(false)}
            onSuccess={() => {
              setIsEditing(false);
              toast.success("Nazwa konta została zmieniona");
            }}
          />
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium text-sm">
              {account.displayName}
            </span>
            <ReuiBadge variant="secondary">
              {account.characterCount}{" "}
              {account.characterCount === 1 ? "postać" : "postaci"}
            </ReuiBadge>
          </div>
        )}
        <div className="mt-1 flex items-center gap-2">
          <a
            className="inline-flex items-center gap-1 text-primary text-xs underline-offset-4 hover:underline"
            href={account.generatedProfileUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ExternalLink className="size-3" />
            Profil Margonem
          </a>
          <span className="font-mono text-xs text-muted-foreground">
            #{account.profileId}
          </span>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Ostatnio pobrano: {formatDateTime(account.lastFetchedAt)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            disabled={isPreviewingRefetch}
            onClick={() => {
              const preview = async () => {
                setIsPreviewingRefetch(true);
                try {
                  const response = await previewRefetch({
                    accountId: account.accountId,
                  });
                  setRefetchPreview(toAccountRefetchPreview(response));
                } catch (error: unknown) {
                  toast.error(
                    getErrorMessage(
                      error,
                      "Nie udało się przygotować odświeżenia"
                    )
                  );
                } finally {
                  setIsPreviewingRefetch(false);
                }
              };

              void preview();
            }}
            size="sm"
            variant="outline"
          >
            {isPreviewingRefetch ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RotateCw className="size-3.5" />
            )}
            Odśwież
          </Button>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Pencil className="size-3.5" />
              Edytuj nazwę
            </Button>
          )}
          <Button
            className="text-destructive hover:text-destructive"
            onClick={() => setIsDeleteOpen(true)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-3.5" />
            Usuń konto
          </Button>
        </div>

        <DeleteAccountDialog
          account={account}
          onDeleted={() => setIsDeleteOpen(false)}
          onOpenChange={setIsDeleteOpen}
          open={isDeleteOpen}
        />

        {refetchPreview !== null && (
          <div className="mt-3 space-y-3 rounded-lg bg-muted/50 p-3">
            <div className="space-y-1">
              <h3 className="font-medium text-sm">Podgląd odświeżenia</h3>
              <div className="flex flex-wrap gap-1.5" aria-live="polite">
                <ReuiBadge variant="success-light">
                  Dodane: {refetchPreview.diff.added.length}
                </ReuiBadge>
                <ReuiBadge variant="destructive-light">
                  Usunięte: {refetchPreview.diff.removed.length}
                </ReuiBadge>
                <ReuiBadge variant="warning-light">
                  Zmienione: {refetchPreview.diff.changed.length}
                </ReuiBadge>
                <ReuiBadge variant="secondary">
                  Bez zmian: {refetchPreview.diff.unchangedCount}
                </ReuiBadge>
              </div>
              {refetchPreview.diff.removed.length > 0 && (
                <Alert variant="warning">
                  <AlertTriangle aria-hidden="true" />
                  <AlertTitle>Zmiana wpłynie na zapisane składy</AlertTitle>
                  <AlertDescription>
                    Usunięte postacie zostaną również usunięte z zapisanych
                    składów.
                  </AlertDescription>
                </Alert>
              )}
              {!hasDiff && (
                <p className="text-muted-foreground text-xs">
                  Nie znaleziono zmian w postaciach z Jaruny.
                </p>
              )}
            </div>

            {refetchPreview.diff.added.length > 0 && (
              <div className="space-y-1">
                <h4 className="font-medium text-xs">Dodane postacie</h4>
                <ul className="space-y-1 text-xs">
                  {refetchPreview.diff.added.map((character) => (
                    <li key={character.characterId}>
                      {character.name} {character.level}{" "}
                      {formatProfession(character.profession)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {refetchPreview.diff.removed.length > 0 && (
              <div className="space-y-1">
                <h4 className="font-medium text-xs">
                  Usunięte z Jaruny / profilu
                </h4>
                <ul className="space-y-1 text-xs">
                  {refetchPreview.diff.removed.map((character) => (
                    <li key={character.databaseCharacterId}>
                      {character.name} {character.level}{" "}
                      {formatProfession(character.profession)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {refetchPreview.diff.changed.length > 0 && (
              <div className="space-y-1">
                <h4 className="font-medium text-xs">Zmienione postacie</h4>
                <ul className="space-y-2 text-xs">
                  {refetchPreview.diff.changed.map((character) => (
                    <li key={character.databaseCharacterId}>
                      <span className="font-medium">{character.name}</span>
                      <ul className="ml-4 list-disc text-muted-foreground">
                        {character.changes.map((change) => (
                          <li
                            key={`${character.databaseCharacterId}-${change.field}`}
                          >
                            {changeFieldLabel(change.field)}: z „
                            {formatChangeValue(change.before)}” na „
                            {formatChangeValue(change.after)}”
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={isApplyingRefetch}
                onClick={() => {
                  const apply = async () => {
                    setIsApplyingRefetch(true);
                    try {
                      const response = await applyRefetch({
                        refetchPreviewId: refetchPreview.refetchPreviewId,
                      });
                      toast.success(
                        response.removedSquadCharacterCount > 0
                          ? `Postacie odświeżone. Usunięto ${response.removedSquadCharacterCount} wpisów ze składów.`
                          : "Postacie zostały odświeżone."
                      );
                      setRefetchPreview(null);
                    } catch (error: unknown) {
                      toast.error(
                        getErrorMessage(
                          error,
                          "Nie udało się zastosować odświeżenia"
                        )
                      );
                    } finally {
                      setIsApplyingRefetch(false);
                    }
                  };

                  void apply();
                }}
                size="sm"
              >
                {isApplyingRefetch ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Zastosuj zmiany
              </Button>
              <Button
                disabled={isApplyingRefetch}
                onClick={() => setRefetchPreview(null)}
                size="sm"
                variant="ghost"
              >
                Nie teraz
              </Button>
            </div>
          </div>
        )}
      </div>
      <section className="min-w-0 border-border lg:border-l lg:pl-6">
        <h3 className="mb-3 flex items-center gap-2 font-medium text-sm">
          <Share2 aria-hidden="true" className="size-4 text-muted-foreground" />
          Udostępnianie konta
        </h3>
        <AccountSharingPanel
          accountDisplayName={account.displayName}
          accountId={account.accountId}
        />
      </section>
    </div>
  );
};

const OWNED_ACCOUNT_COLUMNS: ColumnDef<OwnedAccount>[] = [
  {
    accessorKey: "displayName",
    cell: ({ row }) => (
      <div className="flex min-w-52 items-center gap-3">
        <OwnedAccountCharacterPreview account={row.original} />
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.displayName}</p>
          <p className="font-mono text-xs text-muted-foreground">
            #{row.original.profileId}
          </p>
        </div>
      </div>
    ),
    header: "Konto",
    meta: {
      expandedContent: (account) => <OwnedAccountRow account={account} />,
    },
  },
  {
    accessorKey: "characterCount",
    cell: ({ row }) => (
      <ReuiBadge variant="secondary">{row.original.characterCount}</ReuiBadge>
    ),
    header: "Postacie",
  },
  {
    accessorKey: "lastFetchedAt",
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-mono text-xs">
        {formatDateTime(row.original.lastFetchedAt)}
      </span>
    ),
    header: "Ostatnio pobrano",
  },
  {
    cell: ({ row }) => (
      <a
        className="inline-flex items-center gap-1 whitespace-nowrap text-primary hover:underline"
        href={row.original.generatedProfileUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink className="size-3.5" />
        Margonem
      </a>
    ),
    header: "Profil",
    id: "profile",
  },
  {
    cell: ({ row }) => (
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={`${row.getIsExpanded() ? "Ukryj" : "Pokaż"} szczegóły konta ${row.original.displayName}`}
        onClick={() => row.toggleExpanded()}
      >
        {row.getIsExpanded() ? "Ukryj" : "Zarządzaj"}
      </Button>
    ),
    header: "",
    id: "expand",
  },
];

interface OwnedAccountsPanelProps {
  readonly accounts: readonly OwnedAccount[];
  readonly isLoading: boolean;
  readonly onAddAccount: () => void;
}

export const OwnedAccountsGrid = ({
  accounts,
  isLoading,
  onAddAccount,
}: OwnedAccountsPanelProps) => {
  const columns = OWNED_ACCOUNT_COLUMNS;
  const tableData = useMemo(() => [...accounts], [accounts]);
  const table = useReactTable({
    columns,
    data: tableData,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (account) => String(account.accountId),
  });

  return (
    <Frame className="[--frame-radius:var(--radius-lg)]" spacing="sm">
      <FramePanel className="p-0 shadow-none">
        <FrameHeader className="flex-row items-center justify-between border-b border-border px-5 py-3">
          <FrameTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-muted-foreground" />
            Twoje konta
          </FrameTitle>
          <span className="font-mono text-xs text-muted-foreground">
            {accounts.length}
          </span>
        </FrameHeader>
        <DataGrid
          table={table}
          recordCount={accounts.length}
          isLoading={isLoading}
          loadingMode="spinner"
          emptyMessage={
            <div className="flex flex-col items-center gap-2 py-6">
              <IconStack aria-hidden="true">
                <Users className="size-5" />
              </IconStack>
              <p>Nie masz jeszcze zapisanych kont. Dodaj profil powyżej.</p>
              <Button
                onClick={onAddAccount}
                size="sm"
                type="button"
                variant="outline"
              >
                <Link2 className="size-3.5" />
                Dodaj konto
              </Button>
            </div>
          }
          tableLayout={{
            cellBorder: false,
            rowBorder: true,
            stripped: false,
            width: "auto",
          }}
        >
          <DataGridContainer className="overflow-x-auto">
            <DataGridTable />
          </DataGridContainer>
        </DataGrid>
      </FramePanel>
    </Frame>
  );
};
