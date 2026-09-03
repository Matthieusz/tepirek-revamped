import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CreateSquadGroupFrame } from "@/routes/dashboard/squad-builder/-components/squads/create-squad-group-frame";
import { SquadGroupInvitations } from "@/routes/dashboard/squad-builder/-components/squads/squad-group-invitations";
import { SquadGroupLibrary } from "@/routes/dashboard/squad-builder/-components/squads/squad-group-library";

const SquadBuilderSquadsPage = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-foreground font-serif text-2xl font-bold tracking-tight">
            Składy
          </h1>
          <p className="text-muted-foreground text-sm">
            Twórz grupy składów z postaci dostępnych na Twoich kontach.
          </p>
        </div>
        <Button
          onClick={() => {
            setIsCreateOpen((current) => !current);
          }}
          type="button"
        >
          <HugeiconsIcon
            aria-hidden="true"
            icon={Add01Icon}
            className="size-4"
          />
          Nowa grupa
        </Button>
      </header>

      {isCreateOpen && (
        <CreateSquadGroupFrame
          onClose={() => {
            setIsCreateOpen(false);
          }}
        />
      )}

      <SquadGroupInvitations />
      <SquadGroupLibrary
        onCreateGroup={() => {
          setIsCreateOpen(true);
        }}
      />
    </div>
  );
};

export default SquadBuilderSquadsPage;
