import { useAtomSet } from "@effect/atom-react";
import { useSelector } from "@tanstack/react-form";
import type { OwnedMargonemAccountSummarySchema } from "@tepirek-revamped/api/protocol/squad-builder/account-import/account-import-schema";
import * as Schema from "effect/Schema";
import {
  ExternalLink,
  Loader2,
  Pencil,
  Save,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/app-form";
import { Form, FormFeedback } from "@/components/forms/form";
import { Badge as ReuiBadge } from "@/components/reui/badge";
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
import { Button } from "@/components/ui/button";
import { AccountDisplayNameSchema } from "@/features/squad-builder/account-form-schemas";
import {
  deleteOwnedAccountAtom,
  updateOwnedAccountDisplayNameAtom,
} from "@/features/squad-builder/account-import-atoms";
import { getErrorMessage } from "@/lib/errors";
import type { FormSubmissionError } from "@/lib/form-submission";
import { runFormSubmission } from "@/lib/form-submission";
import { formatDateTime } from "@/lib/utils";
import { AccountRefetchWorkflow } from "@/routes/dashboard/squad-builder/-components/accounts/account-refetch-workflow";
import { AccountSharingPanel } from "@/routes/dashboard/squad-builder/-components/accounts/account-sharing-panel";

type OwnedAccount = OwnedMargonemAccountSummarySchema;

const AccountRenameFormSchema = Schema.Struct({
  displayName: AccountDisplayNameSchema,
});
const AccountRenameFormValidator = Schema.toStandardSchemaV1(
  AccountRenameFormSchema
);

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
  const [submissionFailure, setSubmissionFailure] =
    useState<FormSubmissionError>();
  const updateAccount = useAtomSet(updateOwnedAccountDisplayNameAtom, {
    mode: "promise",
  });
  const form = useAppForm({
    defaultValues: { displayName: account.displayName },
    onSubmit: async ({ value }) => {
      setSubmissionFailure(undefined);
      const decoded =
        await AccountRenameFormValidator["~standard"].validate(value);
      if (!("value" in decoded)) {
        return;
      }
      const result = await runFormSubmission(() =>
        updateAccount({
          accountId: account.accountId,
          displayName: decoded.value.displayName.trim(),
        })
      );
      if (result._tag === "failure") {
        setSubmissionFailure(result.error);
        return;
      }
      form.reset();
      onSuccess();
    },
    validators: { onSubmit: AccountRenameFormValidator },
  });
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  useEffect(() => {
    form.reset({ displayName: account.displayName });
    setSubmissionFailure(undefined);
  }, [account.displayName, form]);

  return (
    <form.AppForm>
      <Form className="space-y-2" form={form}>
        <form.AppField name="displayName">
          {(field) => (
            <field.TextField
              disabled={isSubmitting}
              id={`rename-account-${account.accountId}`}
              label="Nazwa konta"
              maxLength={80}
            />
          )}
        </form.AppField>
        <FormFeedback failure={submissionFailure} />
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
      </Form>
    </form.AppForm>
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

interface OwnedAccountManagementRowProps {
  readonly account: OwnedAccount;
}

/** Renders account operations and sharing controls for an expanded account row. */
export const OwnedAccountManagementRow = ({
  account,
}: OwnedAccountManagementRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <div className="grid gap-6 px-5 py-4 lg:grid-cols-2">
      <div className="min-w-0">
        {isEditing ? (
          <RenameAccountForm
            account={account}
            onCancel={() => {
              setIsEditing(false);
            }}
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
        <AccountRefetchWorkflow accountId={account.accountId}>
          {!isEditing && (
            <Button
              onClick={() => {
                setIsEditing(true);
              }}
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
            onClick={() => {
              setIsDeleteOpen(true);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-3.5" />
            Usuń konto
          </Button>
        </AccountRefetchWorkflow>

        <DeleteAccountDialog
          account={account}
          onDeleted={() => {
            setIsDeleteOpen(false);
          }}
          onOpenChange={setIsDeleteOpen}
          open={isDeleteOpen}
        />
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
