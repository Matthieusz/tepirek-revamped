import { CalendarDays, Pencil, Sword, Trash2, User } from "lucide-react";

import { EditBetModal } from "@/components/modals/edit-bet-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface BetCardMember {
  userId: string;
  userName: string;
  userImage: string | null;
}

export interface BetCardData {
  id: number;
  heroName: string;
  heroLevel: number;
  heroImage: string | null;
  memberCount: number;
  members: BetCardMember[];
  createdByName: string;
  createdByImage: string | null;
  createdAt: Date;
}

interface BetCardProps {
  bet: BetCardData;
  isAdminUser: boolean;
  onDeleteClick: (params: { id: number; heroName: string }) => void;
  pointsPerMember: number;
  formattedCreatedAt: string;
}

export const BetCard = ({
  bet,
  isAdminUser,
  onDeleteClick,
  pointsPerMember,
  formattedCreatedAt,
}: BetCardProps) => (
  <Card className="overflow-hidden p-0">
    <CardContent className="p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="font-semibold">{bet.heroName}</p>
          <p className="text-muted-foreground text-sm">
            Level: {bet.heroLevel}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary">{pointsPerMember} pkt/os</Badge>
          {isAdminUser && (
            <>
              <EditBetModal
                betId={bet.id}
                currentMembers={bet.members.map((member) => ({
                  userId: member.userId,
                  userName: member.userName,
                  userImage: member.userImage,
                }))}
                heroName={bet.heroName}
                memberCount={bet.memberCount}
                trigger={
                  <Button size="icon" type="button" variant="ghost">
                    <Pencil className="size-4" />
                  </Button>
                }
              />
              <Button
                onClick={() => {
                  onDeleteClick({
                    heroName: bet.heroName,
                    id: bet.id,
                  });
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {bet.heroImage !== undefined &&
        bet.heroImage !== null &&
        bet.heroImage !== "" ? (
          <img
            alt={bet.heroName}
            className="mx-auto h-20 w-16 shrink-0 rounded-lg object-contain sm:mx-0 sm:h-16 sm:w-14"
            height={80}
            src={bet.heroImage}
            width={64}
          />
        ) : (
          <div className="mx-auto flex h-20 w-16 shrink-0 items-center justify-center rounded-lg bg-muted sm:mx-0 sm:h-16 sm:w-14">
            <Sword className="size-6 text-muted-foreground" />
          </div>
        )}

        <div className="flex flex-1 flex-wrap items-center justify-center gap-2 sm:justify-start">
          {bet.members.map((member) => (
            <div
              className="flex items-center gap-1.5 rounded-full border bg-muted/30 py-1 pr-2.5 pl-1 sm:gap-2 sm:pr-3"
              key={member.userId}
            >
              <Avatar className="size-5 sm:h-6 sm:w-6">
                <AvatarImage
                  alt={member.userName}
                  src={member.userImage ?? undefined}
                />
                <AvatarFallback className="text-xs">
                  <User className="size-3" />
                </AvatarFallback>
              </Avatar>
              <span className="text-xs sm:text-sm">{member.userName}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t pt-3 text-muted-foreground text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span>Dodane przez:</span>
          <div className="flex items-center gap-1.5">
            <Avatar className="size-5">
              <AvatarImage
                alt={bet.createdByName}
                src={bet.createdByImage ?? undefined}
              />
              <AvatarFallback className="text-[10px]">
                <User className="h-2.5 w-2.5" />
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">
              {bet.createdByName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{formattedCreatedAt}</span>
        </div>
      </div>
    </CardContent>
  </Card>
);
