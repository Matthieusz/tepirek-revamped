import { Calendar, Edit, Mail, Shield, UserCheck } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/route-helpers";
import { formatDate } from "@/lib/utils";
import { EditProfileModal } from "@/routes/dashboard/-components/edit-profile-modal";
import type { AuthSession } from "@/types/route";

interface ProfilePageProps {
  session: AuthSession;
}

const ProfilePage = ({ session }: ProfilePageProps) => {
  const isAdminUser = isAdmin(session);

  return (
    <div className="w-full max-w-lg space-y-6">
      <div>
        <h1 className="text-foreground font-serif text-2xl font-bold tracking-tight">
          Profil
        </h1>
        <p className="text-muted-foreground text-sm">
          Zarządzaj informacjami o swoim koncie.
        </p>
      </div>

      <div className="border-border bg-card rounded-xl border p-6">
        <div className="flex flex-col items-center pb-6">
          <Avatar className="size-24">
            <AvatarImage alt="Avatar" src={session.user.image ?? undefined} />
            <AvatarFallback className="text-2xl">
              {session.user.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h2 className="mt-4 text-xl font-semibold">{session.user.name}</h2>
          <p className="text-muted-foreground text-sm">{session.user.email}</p>
        </div>

        <div className="space-y-4">
          <div className="border-border flex items-center gap-3 border-b pb-4">
            <Mail className="text-muted-foreground size-4" />
            <div className="flex-1">
              <p className="text-muted-foreground text-xs">Email</p>
              <p className="text-sm font-medium">{session.user.email}</p>
            </div>
          </div>

          <div className="border-border flex items-center gap-3 border-b pb-4">
            <Shield className="text-muted-foreground size-4" />
            <div className="flex-1">
              <p className="text-muted-foreground text-xs">Rola</p>
              <p className="text-sm font-medium capitalize">
                {isAdminUser ? "admin" : "user"}
              </p>
            </div>
          </div>

          <div className="border-border flex items-center gap-3 border-b pb-4">
            <UserCheck className="text-muted-foreground size-4" />
            <div className="flex-1">
              <p className="text-muted-foreground text-xs">Status</p>
              <p className="text-sm font-medium">
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
            <Calendar className="text-muted-foreground size-4" />
            <div className="flex-1">
              <p className="text-muted-foreground text-xs">Dołączono</p>
              <p className="text-sm font-medium">
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
};

export default ProfilePage;
