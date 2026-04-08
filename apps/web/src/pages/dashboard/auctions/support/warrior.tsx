import { Axe } from "lucide-react";

import { AuctionHeader } from "@/components/auction-header";
import AuctionTable from "@/components/auction-table";
import { Card, CardContent } from "@/components/ui/card";
import type { AuthSession } from "@/types/route";

const PROFESSION = "warrior";
const TYPE = "support" as const;

interface AuctionProfessionPageProps {
  session: AuthSession;
}

export default function AuctionsSupportWarriorPage({
  session,
}: AuctionProfessionPageProps) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <AuctionHeader
        description="Licytacje broni wsparcia"
        icon={Axe}
        profession={PROFESSION}
        title="Wojownik"
        type={TYPE}
      />

      <Card>
        <CardContent className="pt-6">
          <AuctionTable
            columns={["Blok przebicia", "Bez bloku przebicia"]}
            currentUserId={session.user.id}
            profession={PROFESSION}
            type={TYPE}
          />
        </CardContent>
      </Card>
    </div>
  );
}
