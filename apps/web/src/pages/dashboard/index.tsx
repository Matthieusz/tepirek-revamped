import { useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { Calendar, Megaphone, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AddAnnouncementModal } from "@/components/modals/add-announcement-modal";
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
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Separator } from "@/components/ui/separator";
import {
  announcementsAtom,
  deleteAnnouncementAtom,
  optimisticAnnouncementsAtom,
} from "@/lib/announcement-atoms";
import { resultIsLoading } from "@/lib/effect-atom-result";
import { getErrorMessage } from "@/lib/errors";
import { isAdmin } from "@/lib/route-helpers";
import { formatDateTime } from "@/lib/utils";
import type { AuthSession } from "@/types/route";

type AnnouncementToDelete = {
  id: number;
  title: string;
} | null;

interface DashboardHomePageProps {
  session: AuthSession;
}

export default function DashboardHomePage({ session }: DashboardHomePageProps) {
  const [announcementToDelete, setAnnouncementToDelete] =
    useState<AnnouncementToDelete>(null);
  const announcementsResult = useAtomValue(announcementsAtom);
  const announcements = useAtomValue(optimisticAnnouncementsAtom);
  const isPending = resultIsLoading(announcementsResult);
  const deleteAnnouncement = useAtomSet(deleteAnnouncementAtom, {
    mode: "promise",
  });

  const isAdminUser = isAdmin(session);

  const [isDeleting, setIsDeleting] = useState(false);
  const deleteMutation = {
    isPending: isDeleting,
    mutate: (id: number) => {
      void (async () => {
        setIsDeleting(true);
        try {
          await deleteAnnouncement({ id });
          toast.success("Ogłoszenie zostało usunięte");
          setAnnouncementToDelete(null);
        } catch (error: unknown) {
          toast.error(getErrorMessage(error));
        } finally {
          setIsDeleting(false);
        }
      })();
    },
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
          Ogłoszenia
        </h1>
        {isAdminUser && (
          <AddAnnouncementModal
            trigger={
              <Button>
                <Plus className="size-4" />
                Dodaj ogłoszenie
              </Button>
            }
          />
        )}
      </div>

      {isPending && <LoadingSpinner />}

      {!isPending && (!announcements || announcements.length === 0) && (
        <EmptyState icon={Megaphone} message="Brak ogłoszeń do wyświetlenia" />
      )}

      {!isPending && announcements && announcements.length > 0 && (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <article
              className="rounded-xl border border-border bg-card p-6"
              key={announcement.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-lg leading-snug">
                    {announcement.title}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-sm">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5">
                        <AvatarImage
                          alt={announcement.user?.name ?? "Avatar"}
                          src={announcement.user?.image ?? undefined}
                        />
                        <AvatarFallback className="text-xs">
                          {announcement.user?.name?.charAt(0) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">
                        {announcement.user?.name ?? announcement.user?.id}
                      </span>
                    </div>
                    <Separator
                      className="hidden h-4 sm:block"
                      orientation="vertical"
                    />
                    <div className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      <span>{formatDateTime(announcement.createdAt)}</span>
                    </div>
                  </div>
                </div>
                {isAdminUser && (
                  <Button
                    aria-label="Usuń ogłoszenie"
                    onClick={() => {
                      setAnnouncementToDelete({
                        id: announcement.id,
                        title: announcement.title,
                      });
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              <p className="mt-4 whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
                {announcement.description}
              </p>
            </article>
          ))}
        </div>
      )}

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setAnnouncementToDelete(null);
          }
        }}
        open={announcementToDelete !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy na pewno chcesz usunąć ogłoszenie?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ogłoszenie &quot;{announcementToDelete?.title}&quot; zostanie
              trwale usunięte. Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (announcementToDelete) {
                  deleteMutation.mutate(announcementToDelete.id);
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
}
