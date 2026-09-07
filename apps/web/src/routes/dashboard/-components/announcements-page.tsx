import {
  Add01Icon,
  Calendar04Icon,
  Delete01Icon,
  Megaphone02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Separator } from "@/components/ui/separator";
import type { Announcement } from "@/features/announcements/announcement-api";
import {
  announcementsQueryOptions,
  deleteAnnouncementMutationOptions,
} from "@/features/announcements/announcement-queries";
import { getErrorMessage } from "@/lib/errors";
import { isAdmin } from "@/lib/route-helpers";
import { formatDateTime } from "@/lib/utils";
import { AddAnnouncementModal } from "@/routes/dashboard/-components/add-announcement-modal";
import type { AuthSession } from "@/types/route";

type AnnouncementToDelete = {
  id: number;
  title: string;
} | null;

interface DashboardHomePageProps {
  session: AuthSession;
}

const DashboardHomePage = ({ session }: DashboardHomePageProps) => {
  const announcementsQuery = useQuery(announcementsQueryOptions());

  if (announcementsQuery.isPending) {
    return <LoadingSpinner />;
  }

  if (announcementsQuery.isError && announcementsQuery.data === undefined) {
    return (
      <QueryErrorState
        message={getErrorMessage(
          announcementsQuery.error,
          "Nie udało się wczytać ogłoszeń. Spróbuj ponownie."
        )}
        onRetry={() => {
          void announcementsQuery.refetch();
        }}
      />
    );
  }

  return (
    // oxlint-disable-next-line no-use-before-define -- the page boundary keeps the query lifecycle separate from the content UI
    <DashboardHomeContent
      announcements={announcementsQuery.data ?? []}
      isRefreshing={announcementsQuery.isFetching}
      onRetry={() => {
        void announcementsQuery.refetch();
      }}
      refreshError={
        announcementsQuery.isError ? announcementsQuery.error : undefined
      }
      session={session}
    />
  );
};

export default DashboardHomePage;

interface DashboardHomeContentProps extends DashboardHomePageProps {
  readonly announcements: readonly Announcement[];
  readonly isRefreshing: boolean;
  readonly onRetry: () => void;
  readonly refreshError: unknown;
}

const DashboardHomeContent = ({
  announcements,
  isRefreshing,
  onRetry,
  refreshError,
  session,
}: DashboardHomeContentProps) => {
  const queryClient = useQueryClient();
  const [announcementToDelete, setAnnouncementToDelete] =
    useState<AnnouncementToDelete>(null);
  const deleteMutation = useMutation(
    deleteAnnouncementMutationOptions(queryClient)
  );

  const isAdminUser = isAdmin(session);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-foreground font-serif text-2xl font-bold tracking-tight">
          Ogłoszenia
        </h1>
        {isAdminUser && (
          <AddAnnouncementModal
            trigger={
              <Button>
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={Add01Icon}
                  className="size-4"
                />
                Dodaj ogłoszenie
              </Button>
            }
          />
        )}
      </div>

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
            {getErrorMessage(refreshError, "Nie udało się odświeżyć ogłoszeń.")}
          </p>
          <Button onClick={onRetry} size="sm" variant="outline">
            Spróbuj ponownie
          </Button>
        </div>
      )}

      {announcements.length === 0 && (
        <EmptyState
          icon={<HugeiconsIcon aria-hidden="true" icon={Megaphone02Icon} />}
          message="Brak ogłoszeń do wyświetlenia"
        />
      )}

      {announcements.length > 0 && (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <article
              className="border-border bg-card rounded-xl border p-6"
              key={announcement.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg leading-snug font-semibold break-words">
                    {announcement.title}
                  </h2>
                  <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
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
                      <HugeiconsIcon
                        aria-hidden="true"
                        icon={Calendar04Icon}
                        className="size-3.5"
                      />
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
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={Delete01Icon}
                      className="size-4"
                    />
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground mt-4 text-sm leading-relaxed break-words whitespace-pre-wrap">
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
                  deleteMutation.mutate(
                    { id: announcementToDelete.id },
                    {
                      onError: (error) => {
                        toast.error(getErrorMessage(error));
                      },
                      onSuccess: () => {
                        toast.success("Ogłoszenie zostało usunięte");
                        setAnnouncementToDelete(null);
                      },
                    }
                  );
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
