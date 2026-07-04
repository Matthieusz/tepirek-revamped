import { useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { useForm } from "@tanstack/react-form";
import * as Schema from "effect/Schema";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { HeroBetMemberPicker } from "@/components/events/hero-bet-member-picker";
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
import { editBetAtom } from "@/lib/bet-atoms";
import { resultIsLoading, resultValueOr } from "@/lib/effect-atom-result";
import {
  effectSchemaValidator,
  formErrorMessage,
} from "@/lib/effect-schema-validator";
import { getErrorMessage } from "@/lib/errors";
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
  trigger?: React.ReactNode;
}

const EditBetFormSchema = Schema.Struct({
  userIds: Schema.NonEmptyArray(Schema.String),
});

export const EditBetModal = ({
  betId,
  currentMembers,
  heroName,
  memberCount,
  trigger,
}: EditBetModalProps) => {
  const [open, setOpen] = useState(false);
  const editBet = useAtomSet(editBetAtom, { mode: "promise" });

  const currentMemberIds = currentMembers.map((m) => m.userId);

  const verifiedUsersResult = useAtomValue(verifiedUsersAtom);
  const verifiedUsers = [...resultValueOr(verifiedUsersResult, [])];
  const usersLoading = resultIsLoading(verifiedUsersResult);
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm({
    defaultValues: {
      userIds: currentMemberIds,
    },
    onSubmit: async ({ value }) => {
      setIsEditing(true);
      try {
        await editBet({
          betId,
          newUserIds: value.userIds as [string, ...string[]],
        });
        toast.success("Obstawienie zostało zaktualizowane");
        setOpen(false);
      } catch (error: unknown) {
        toast.error(getErrorMessage(error));
      } finally {
        setIsEditing(false);
      }
    },
    validators: {
      onSubmit: effectSchemaValidator(EditBetFormSchema),
    },
  });

  return (
    <ResponsiveDialog onOpenChange={setOpen} open={open}>
      <ResponsiveDialogTrigger asChild>
        {trigger ?? (
          <Button size="icon" type="button" variant="ghost">
            <Pencil className="size-4" />
          </Button>
        )}
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-[600px]">
        <form
          action={() => {
            form.handleSubmit();
          }}
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Edytuj obstawienie</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Modyfikuj listę graczy obstawiających herosa &quot;{heroName}
              &quot;.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <form.Field name="userIds">
            {(field) => (
              <div className="grid gap-4 py-4">
                <HeroBetMemberPicker
                  clearEnabled
                  idPrefix="edit-user"
                  initialMemberIds={currentMemberIds}
                  onChange={field.handleChange}
                  pointsPreview={{ currentMemberCount: memberCount }}
                  restoreEnabled
                  selectedUserIds={field.state.value}
                  users={verifiedUsers}
                  usersLoading={usersLoading}
                  variant="edit"
                />
                {field.state.meta.errors.map((error) => (
                  <p
                    className="text-red-500 text-sm"
                    key={formErrorMessage(error)}
                  >
                    {formErrorMessage(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <ResponsiveDialogFooter>
            <form.Subscribe>
              {(state) => (
                <Button
                  disabled={
                    !state.canSubmit ||
                    state.isSubmitting ||
                    usersLoading ||
                    isEditing
                  }
                  type="submit"
                >
                  {isEditing ? "Zapisywanie..." : "Zapisz zmiany"}
                </Button>
              )}
            </form.Subscribe>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
