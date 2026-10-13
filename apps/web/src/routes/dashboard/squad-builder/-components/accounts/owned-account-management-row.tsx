import { useSelector } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OwnedMargonemAccountSummarySchema } from "@tepirek-revamped/api/protocol/squad-builder/account-import/account-import-schema";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import { X, Trash2, Loader2, Pencil, Save, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/app-form";
import { Form, FormFeedback } from "@/components/forms/form";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AccountDisplayNameSchema } from "@/features/squad-builder/account-form-schemas";
import {
  deleteOwnedAccountMutationOptions,
  updateOwnedAccountDisplayNameMutationOptions,
} from "@/features/squad-builder/account-queries";
import { getErrorMessage } from "@/lib/errors";
import type { FormSubmissionError } from "@/lib/form-submission";
import { runFormSubmission } from "@/lib/form-submission";
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

  const queryClient = useQueryClient();

  const updateAccount = useMutation(
    updateOwnedAccountDisplayNameMutationOptions(queryClient)
  );

  const form = useAppForm({
    defaultValues: { displayName: account.displayName },
    onSubmit: async ({ value }) => {
      setSubmissionFailure(undefined);

      const decoded =
        await AccountRenameFormValidator["~standard"].validate(value);

      if (!("value" in decoded)) {
        return;
      }

      const result = await runFormSubmission(
        async () =>
          await updateAccount.mutateAsync({
            accountId: account.accountId,
            displayName: decoded.value.displayName.trim(),
          })
      );

      if (Predicate.isTagged("failure")(result)) {
        setSubmissionFailure(result.error);

        return;
      }

      form.reset();
      onSuccess();
    },
    validators: { onSubmit: AccountRenameFormValidator },
  });

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

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
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="size-3.5" />
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
            <X aria-hidden="true" className="size-3.5" />
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
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteAccount = useMutation(
    deleteOwnedAccountMutationOptions(queryClient)
  );

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteAccount.mutateAsync({
        accountId: account.accountId,
      });

      onOpenChange(false);
      onDeleted();
      toast.success(
        result.removedSquadCharacterCount > 0
          ? `Konto usunięte. Usunięto ${result.removedSquadCharacterCount} wpisów ze składów.`
          : "Konto zostało usunięte."
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Nie udało się usunąć konta"));
    }

    setIsDeleting(false);
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent className="text-left whitespace-normal" size="sm">
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
            onClick={() => {
              void handleDelete();
            }}
            variant="destructive"
          >
            {isDeleting ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Trash2 aria-hidden="true" className="size-4" />
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

/** Renders direct account actions with focused rename, sharing, and deletion dialogs. */
export const OwnedAccountManagementRow = ({
  account,
}: OwnedAccountManagementRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <AccountRefetchWorkflow accountId={account.accountId}>
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogTrigger
          aria-label={`Edytuj nazwę konta ${account.displayName}`}
          title="Edytuj nazwę"
          render={<Button size="sm" variant="outline" />}
        >
          <Pencil aria-hidden="true" className="size-3.5" />
          <span className="hidden lg:inline">Edytuj nazwę</span>
        </DialogTrigger>
        <DialogContent className="text-left whitespace-normal">
          <DialogHeader className="pr-8">
            <DialogTitle>Edytuj nazwę konta</DialogTitle>
            <DialogDescription>
              Zmień nazwę konta „{account.displayName}”.
            </DialogDescription>
          </DialogHeader>
          <RenameAccountForm
            account={account}
            key={account.displayName}
            onCancel={() => {
              setIsEditing(false);
            }}
            onSuccess={() => {
              setIsEditing(false);
              toast.success("Nazwa konta została zmieniona");
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog>
        <DialogTrigger
          aria-label={`Udostępnij konto ${account.displayName}`}
          title="Udostępnij"
          render={<Button size="sm" variant="outline" />}
        >
          <Share2 aria-hidden="true" className="size-3.5" />
          <span className="hidden lg:inline">Udostępnij</span>
        </DialogTrigger>
        <DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden text-left whitespace-normal sm:max-w-xl">
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle>Udostępnij konto „{account.displayName}”</DialogTitle>
            <DialogDescription>
              Zaproś użytkowników i zarządzaj dostępem do konta.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            <AccountSharingPanel
              accountDisplayName={account.displayName}
              accountId={account.accountId}
            />
          </div>
        </DialogContent>
      </Dialog>
      <div className="ml-1 border-l pl-2">
        <Button
          aria-label={`Usuń konto ${account.displayName}`}
          title="Usuń konto"
          className="bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
          onClick={() => {
            setIsDeleteOpen(true);
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </Button>
      </div>
      <DeleteAccountDialog
        account={account}
        onDeleted={() => {
          setIsDeleteOpen(false);
        }}
        onOpenChange={setIsDeleteOpen}
        open={isDeleteOpen}
      />
    </AccountRefetchWorkflow>
  );
};
