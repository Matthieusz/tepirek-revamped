import { Calendar, Edit, Mail, Shield, UserCheck } from "lucide-react";

import { EditProfileModal } from "@/components/modals/edit-profile-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/route-helpers";
import { formatDate } from "@/lib/utils";
import type { AuthSession } from "@/types/route";

interface ProfilePageProps {
  session: AuthSession;
}

export default function ProfilePage({ session }: ProfilePageProps) {
  const isAdminUser = isAdmin(session);

  return (
    <div className="w-full max-w-lg space-y-6">
      <div>
        <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
          Profil
        </h1>
        <p className="text-muted-foreground text-sm">
          Zarządzaj informacjami o swoim koncie.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-center pb-6">
          <Avatar className="size-24">
            <AvatarImage alt="Avatar" src={session.user.image ?? undefined} />
            <AvatarFallback className="text-2xl">
              {session.user.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h2 className="mt-4 font-semibold text-xl">{session.user.name}</h2>
          <p className="text-muted-foreground text-sm">{session.user.email}</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Mail className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-muted-foreground text-xs">Email</p>
              <p className="font-medium text-sm">{session.user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Shield className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-muted-foreground text-xs">Rola</p>
              <p className="font-medium text-sm capitalize">
                {isAdminUser ? "admin" : "user"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 border-b border-border pb-4">
            <UserCheck className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-muted-foreground text-xs">Status</p>
              <p className="font-medium text-sm">
                <span
                  className={
                    session.user.verified
                      ? "text-primary"
                      : "text-muted-foreground"
                  }
                >
                  {session.user.verified ? "Zweryfikowany" : "Oczekujący"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="size-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-muted-foreground text-xs">Dołączono</p>
              <p className="font-medium text-sm">
                {formatDate(session.user.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <EditProfileModal
          defaultName={session.user.name}
          trigger={
            <Button className="mt-6 w-full" variant="outline">
              <Edit className="size-4" />
              Edytuj profil
            </Button>
          }
        />
      </div>
    </div>
  );
}
