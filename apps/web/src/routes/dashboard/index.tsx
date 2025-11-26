import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash } from "lucide-react";
import { AddAnnouncementModal } from "@/components/modals/add-announcement-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/")({
  component: RouteComponent,
  staticData: {
    crumb: "Strona główna",
  },
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const { data: announcements, isPending } = useQuery(
    orpc.announcement.getAll.queryOptions()
  );
  const queryClient = useQueryClient();

  return (
    <div className="leading-loose">
      <h1 className="font-bold text-3xl">Hej, {session.name} 🥳</h1>
      <p className="font-semibold text-xl">
        Witam na stronie klanowej Gildii Złodziei
      </p>
      <div className="mt-8 flex items-center gap-4">
        <h2 className="font-semibold text-2xl">Ogłoszenia: </h2>
        {session.role === "admin" && (
          <AddAnnouncementModal
            trigger={
              <Button>
                <Plus />
                Dodaj ogłoszenie
              </Button>
            }
          />
        )}
      </div>
      {isPending && (
        <div className="mt-4">
          <CardGridSkeleton count={3} />
        </div>
      )}
      {!isPending && (!announcements || announcements.length === 0) && (
        <p className="mt-4 text-muted-foreground">Brak ogłoszeń</p>
      )}
      {!isPending && announcements && announcements.length > 0 && (
        <div className="mt-4 flex flex-col items-center gap-8">
          {announcements.map((announcement) => (
            <Card
              className="mx-auto w-full min-w-xl max-w-4xl border border-muted bg-background shadow-lg"
              key={announcement.id}
            >
              <div className="relative">
                <CardHeader className="flex items-center justify-between">
                  <h2 className="font-bold text-2xl">{announcement.title}</h2>
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground">
                      {announcement.user?.name ?? announcement.user?.id}
                    </p>
                    <Avatar>
                      <AvatarImage
                        alt={announcement.user?.name ?? "Avatar"}
                        src={announcement.user?.image ?? undefined}
                      />
                      <AvatarFallback>
                        {announcement.user?.name?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </CardHeader>
              </div>
              <CardContent className="text-base">
                {announcement.description}
              </CardContent>
              <CardFooter className="justify-between text-muted-foreground text-sm">
                <div>
                  <span className="font-semibold">Data dodania:</span>{" "}
                  {new Date(announcement.createdAt).toLocaleDateString(
                    "pl-PL",
                    {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </div>
                {session.role === "admin" && (
                  <Button
                    aria-label="Usuń ogłoszenie"
                    onClick={async () => {
                      if (
                        window.confirm(
                          "Czy na pewno chcesz usunąć to ogłoszenie?"
                        )
                      ) {
                        await orpc.announcement.delete.call({
                          id: announcement.id,
                        });
                        queryClient.invalidateQueries({
                          queryKey: orpc.announcement.getAll.queryKey(),
                        });
                      }
                    }}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash /> Usuń
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
