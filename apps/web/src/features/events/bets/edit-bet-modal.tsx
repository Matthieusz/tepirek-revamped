import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  EffectForm,
  EffectFormFeedback,
  useEffectFormProtection,
} from "@/components/forms/effect-form";
import {
  EffectFieldError,
  getFieldErrorId,
  getFieldId,
} from "@/components/forms/effect-form-field-helpers";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { editBetAtom } from "@/features/events/bets/bet-atoms";
import { HeroBetMemberPicker } from "@/features/events/bets/hero-bet-member-picker";
import type { SelectableUser } from "@/features/events/bets/user-select-list";
import { NonEmptyUserIdsSchema } from "@/lib/form-schemas";
import { formSubmission } from "@/lib/form-submission";
import { verifiedUsersAtom } from "@/lib/user-atoms";

interface EditBetModalProps {
  betId: number;
  currentMembers: {
    userId: string;
    userName: string;
    userImage: string | null;
  }[];
  heroName: string;
  memberCount: number;
  refreshInput: {
    readonly eventId?: number;
    readonly heroId?: number;
    readonly limit?: number;
    readonly page?: number;
  };
  trigger?: React.ReactNode;
}

interface EditMembersFieldProps {
  readonly currentMemberIds: string[];
  readonly memberCount: number;
  readonly users: SelectableUser[];
  readonly usersLoading: boolean;
}

const EditMembersField: FormReact.FieldComponent<
  readonly string[],
  EditMembersFieldProps
> = ({ field, props }) => {
  const fieldId = getFieldId(field.path);
  const errorId = getFieldErrorId(fieldId);
  const hasError = Option.isSome(field.error);

  return (
    <fieldset
      aria-describedby={hasError ? errorId : undefined}
      aria-invalid={hasError}
      aria-labelledby={`${fieldId}-label`}
      className="grid gap-2 py-4"
      id={fieldId}
    >
      <legend className="sr-only" id={`${fieldId}-label`}>
        Gracze
      </legend>
      <HeroBetMemberPicker
        clearEnabled
        fieldName={field.path}
        idPrefix={fieldId}
        initialMemberIds={props.currentMemberIds}
        onBlur={field.onBlur}
        onChange={field.onChange}
        pointsPreview={{ currentMemberCount: props.memberCount }}
        restoreEnabled
        selectedUserIds={[...field.value]}
        users={props.users}
        usersLoading={props.usersLoading}
        variant="edit"
      />
      <EffectFieldError error={field.error} id={errorId} />
    </fieldset>
  );
};

const editBetFormBuilder = FormBuilder.empty.addField(
  "userIds",
  NonEmptyUserIdsSchema
);

interface BetUpdate {
  readonly betId: number;
  readonly newUserIds: readonly [string, ...string[]];
  readonly refreshInput: EditBetModalProps["refreshInput"];
}

type EditBet = (update: BetUpdate) => Promise<unknown>;

interface EditBetSubmitArgs {
  readonly betId: number;
  readonly editBet: EditBet;
  readonly refreshInput: EditBetModalProps["refreshInput"];
}

export const EditBetModal = ({
  betId,
  currentMembers,
  heroName,
  memberCount,
  refreshInput,
  trigger,
}: EditBetModalProps) => {
  const [open, setOpen] = useState(false);
  const editBet = useAtomSet(editBetAtom, { mode: "promise" });
  const currentMemberIds = useMemo(
    () => currentMembers.map((member) => member.userId),
    [currentMembers]
  );

  const verifiedUsersResult = useAtomValue(verifiedUsersAtom);
  const verifiedUsers = AsyncResult.isSuccess(verifiedUsersResult)
    ? [...verifiedUsersResult.value]
    : [];
  const usersLoading = !AsyncResult.isSuccess(verifiedUsersResult);
  const form = useMemo(
    () =>
      FormReact.make(editBetFormBuilder, {
        fields: { userIds: EditMembersField },
        mode: { validation: "onSubmit" },
        onSubmit: (submitArgs: EditBetSubmitArgs, { decoded }) =>
          formSubmission(() =>
            submitArgs.editBet({
              betId: submitArgs.betId,
              newUserIds: decoded.userIds,
              refreshInput: submitArgs.refreshInput,
            })
          ),
      }),
    []
  );
  const submit = useAtomSet(form.submit);
  const reset = useAtomSet(form.reset);
  const submitResult = useAtomValue(form.submit);
  const isDirty = useAtomValue(form.isDirty);
  const canDiscard = useEffectFormProtection(isDirty, submitResult.waiting);
  let submitLabel = "Zapisz zmiany";
  if (usersLoading) {
    submitLabel = "Ładowanie...";
  }
  if (submitResult.waiting) {
    submitLabel = "Zapisywanie...";
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (!canDiscard()) {
        return;
      }
      reset();
    }
    setOpen(nextOpen);
  };

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogTrigger asChild>
        {trigger ?? (
          <Button
            aria-label={`Edytuj obstawienie na herosa ${heroName}`}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-[600px]">
        <form.Initialize
          defaultValues={{ userIds: currentMemberIds }}
          key={currentMemberIds.join("\u0000")}
        >
          <EffectForm
            action={() =>
              submit({
                betId,
                editBet: async (update) => {
                  const result = await editBet(update);
                  toast.success("Obstawienie zostało zaktualizowane");
                  reset();
                  setOpen(false);
                  return result;
                },
                refreshInput,
              })
            }
            submitResult={submitResult}
          >
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Edytuj obstawienie</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Modyfikuj listę graczy obstawiających herosa &quot;{heroName}
                &quot;.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            <form.userIds
              currentMemberIds={currentMemberIds}
              memberCount={memberCount}
              users={verifiedUsers}
              usersLoading={usersLoading}
            />

            <EffectFormFeedback result={submitResult} />
            <ResponsiveDialogFooter>
              <Button
                disabled={submitResult.waiting}
                onClick={() => handleOpenChange(false)}
                type="button"
                variant="outline"
              >
                Anuluj
              </Button>
              <Button
                disabled={submitResult.waiting || usersLoading}
                type="submit"
              >
                {submitLabel}
              </Button>
            </ResponsiveDialogFooter>
          </EffectForm>
        </form.Initialize>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
