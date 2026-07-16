import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CreateSquadGroupFrame } from "@/pages/dashboard/squad-builder/squads/create-squad-group-frame";
import { SquadGroupInvitations } from "@/pages/dashboard/squad-builder/squads/squad-group-invitations";
import { SquadGroupLibrary } from "@/pages/dashboard/squad-builder/squads/squad-group-library";

export default function SquadBuilderSquadsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif font-bold text-foreground text-2xl tracking-tight">
            Składy
          </h1>
          <p className="text-muted-foreground text-sm">
            Twórz grupy składów z postaci dostępnych na Twoich kontach.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen((current) => !current)}
          type="button"
        >
          <Plus className="size-4" />
          Nowa grupa
        </Button>
      </header>

      {isCreateOpen && (
        <CreateSquadGroupFrame onClose={() => setIsCreateOpen(false)} />
      )}

      <SquadGroupInvitations />
      <SquadGroupLibrary onCreateGroup={() => setIsCreateOpen(true)} />
    </div>
  );
}
