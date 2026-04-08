import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Separator } from "@/components/ui/separator";
import { isAdmin } from "@/lib/route-helpers";
import { formatDateTime } from "@/lib/utils";
import type { AuthSession } from "@/types/route";
import { orpc } from "@/utils/orpc";

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
  const { data: announcements, isPending } = useQuery(
    orpc.announcement.getAll.queryOptions()
  );
  const queryClient = useQueryClient();

  const isAdminUser = isAdmin(session);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await orpc.announcement.delete.call({ id });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Wystąpił błąd";
      toast.error(message);
    },
    onSuccess: async () => {
      toast.success("Ogłoszenie zostało usunięte");
      await queryClient.invalidateQueries({
        queryKey: orpc.announcement.getAll.queryKey(),
      });
      setAnnouncementToDelete(null);
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Welcome Section */}
      <Card className="border-none bg-linear-to-r from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl">
            Witaj, {session.user.name}! 👋
          </CardTitle>
          <CardDescription className="text-base">
            Strona klanowa Gildii Złodziei — sprawdź najnowsze ogłoszenia.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Announcements Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="mb-1 font-bold text-xl tracking-tight">
              Ogłoszenia
            </h2>
          </div>
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
          <>
            <EmptyState
              icon={Megaphone}
              message="Brak ogłoszeń do wyświetlenia"
            />
          </>
        )}

        {!isPending && announcements && announcements.length > 0 && (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {announcement.title}
                      </CardTitle>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground text-sm sm:gap-3">
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
                          <span>
                            {announcement.user?.name ?? announcement.user?.id}
                          </span>
                        </div>
                        <Separator
                          className="hidden h-4 sm:block"
                          orientation="vertical"
                        />
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
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
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
                    {announcement.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
