import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

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
import { getErrorMessage } from "@/lib/errors";
import { invalidateBetLedgerQueries } from "@/lib/query-invalidation";
import { orpc } from "@/utils/orpc";

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

const schema = z.object({
  userIds: z.array(z.string()).min(1, "Wybierz przynajmniej jednego gracza"),
});

export const EditBetModal = ({
  betId,
  currentMembers,
  heroName,
  memberCount,
  trigger,
}: EditBetModalProps) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const currentMemberIds = currentMembers.map((m) => m.userId);

  const { data: verifiedUsers, isPending: usersLoading } = useQuery(
    orpc.user.getVerified.queryOptions()
  );

  const editMutation = useMutation({
    mutationFn: async (newUserIds: string[]) => {
      await orpc.bet.edit.call({ betId, newUserIds });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
    onSuccess: async () => {
      toast.success("Obstawienie zostało zaktualizowane");
      await invalidateBetLedgerQueries(queryClient);
      setOpen(false);
    },
  });

  const form = useForm({
    defaultValues: {
      userIds: currentMemberIds,
    },
    onSubmit: async ({ value }) => {
      await editMutation.mutateAsync(value.userIds);
    },
    validators: {
      onSubmit: schema,
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
                  <p className="text-red-500 text-sm" key={error?.message}>
                    {error?.message}
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
                    editMutation.isPending
                  }
                  type="submit"
                >
                  {editMutation.isPending ? "Zapisywanie..." : "Zapisz zmiany"}
                </Button>
              )}
            </form.Subscribe>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
