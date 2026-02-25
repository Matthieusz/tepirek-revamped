import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Edit, Mail, Shield, UserCheck } from "lucide-react";

import { EditProfileModal } from "@/components/modals/edit-profile-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, isAdmin } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/profile")({
  component: RouteComponent,
  staticData: {
    crumb: "Profil",
  },
});

const RouteComponent = () => {
  const { session } = Route.useRouteContext();
  const isAdminUser = isAdmin(session);

  return (
    <div className="w-full max-w-lg space-y-6">
      <div>
        <h1 className="mb-1 font-bold text-2xl tracking-tight">Profil</h1>
        <p className="text-muted-foreground text-sm">
          Zarządzaj informacjami o swoim koncie.
        </p>
      </div>

      <Card>
        <CardHeader className="items-center pb-2">
          <Avatar className="size-24">
            <AvatarImage alt="Avatar" src={session.user.image ?? undefined} />
            <AvatarFallback className="text-2xl">
              {session.user.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="mt-4 text-xl">{session.user.name}</CardTitle>
          <CardDescription>{session.user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-muted-foreground text-xs">Email</p>
              <p className="font-medium text-sm">{session.user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-muted-foreground text-xs">Rola</p>
              <p className="font-medium text-sm capitalize">
                {isAdminUser ? "admin" : "user"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-muted-foreground text-xs">Status</p>
              <p className="font-medium text-sm">
                <span
                  className={
                    session.user.verified ? "text-green-500" : "text-yellow-500"
                  }
                >
                  {session.user.verified ? "Zweryfikowany" : "Oczekujący"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-muted-foreground text-xs">Dołączono</p>
              <p className="font-medium text-sm">
                {session.user.createdAt
                  ? formatDate(session.user.createdAt)
                  : "—"}
              </p>
            </div>
          </div>

          {session && (
            <EditProfileModal
              defaultName={session.user.name as string}
              trigger={
                <Button className="mt-2 w-full" variant="outline">
                  <Edit className="h-4 w-4" />
                  Edytuj profil
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
