import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Edit } from "lucide-react";
import { EditProfileModal } from "@/components/modals/edit-profile-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/profile")({
  component: RouteComponent,
  staticData: {
    crumb: "Profil",
  },
});

function RouteComponent() {
  const currentUser = useQuery(orpc.user.getSession.queryOptions());
  const user = currentUser.data?.user;
  return (
    <div className="flex w-[450px] flex-col gap-6 overflow-auto py-4">
      <Card>
        <CardHeader className="flex flex-row items-start gap-4">
          <Avatar className="size-20 rounded-lg">
            <AvatarImage alt="Avatar" src={user?.image ?? undefined} />
            <AvatarFallback>
              <img alt="default-avatar" src="/default-avatar.webp" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col gap-1">
            <CardTitle className="text-xl">{user?.name}</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
            <div className="flex flex-wrap items-center gap-2 pt-2 text-muted-foreground text-xs">
              <span>Rola: {user?.role}</span>
              <Separator className="h-4" orientation="vertical" />
              <span>
                Status: {user?.verified ? "Zweryfikowany" : "Niezweryfikowany"}
              </span>
            </div>
          </div>
          {user ? (
            <EditProfileModal
              defaultName={user.name as string}
              trigger={
                <Button size="sm" variant="outline">
                  <Edit className="mr-2 size-4" /> Edytuj profil
                </Button>
              }
            />
          ) : null}
        </CardHeader>
      </Card>
    </div>
  );
}
