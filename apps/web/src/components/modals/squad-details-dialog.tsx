import { useQuery } from "@tanstack/react-query";
import { Globe, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfessionColor } from "@/lib/margonem-parser";
import { orpc } from "@/utils/orpc";

type SquadDetailsDialogProps = {
  squadId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SquadDetailsDialog({
  squadId,
  open,
  onOpenChange,
}: SquadDetailsDialogProps) {
  const { data: details, isPending } = useQuery({
    ...orpc.squad.getSquadDetails.queryOptions({ input: { id: squadId } }),
    enabled: open,
  });

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent className="min-w-3xl">
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-2">
            <ResponsiveDialogTitle className="text-xl">
              {details?.name ?? "Ładowanie..."}
            </ResponsiveDialogTitle>
            {details?.isPublic ? (
              <Globe className="h-4 w-4 text-green-500" />
            ) : (
              <Lock className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <ResponsiveDialogDescription>
            {details?.world &&
              `Świat: ${details.world.charAt(0).toUpperCase() + details.world.slice(1)}`}
            {details?.description && ` • ${details.description}`}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="py-4">
          {isPending && (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}
          {!isPending &&
            (!details?.members || details.members.length === 0) && (
              <p className="py-8 text-center text-muted-foreground">
                Ten squad nie ma żadnych członków
              </p>
            )}
          {!isPending && details?.members && details.members.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                Skład drużyny ({details.members.length}/10)
              </Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {details.members.map((member) => (
                  <div
                    className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2"
                    key={member.id}
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                      {member.position}
                    </div>
                    {member.characterAvatarUrl && (
                      <div
                        className="h-12 w-8 shrink-0 overflow-hidden rounded"
                        style={{
                          backgroundImage: `url(${member.characterAvatarUrl})`,
                          backgroundSize: "128px 192px",
                          backgroundPosition: "0 0",
                        }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="truncate font-medium text-sm">
                          {member.characterNick}
                        </span>
                        <Badge
                          className={`${getProfessionColor(member.characterProfession)} text-[10px]`}
                          variant="outline"
                        >
                          {member.characterProfessionName}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Lvl {member.characterLevel} • {member.gameAccountName}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <ResponsiveDialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Zamknij
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
