import { ComingSoon } from "@/components/coming-soon";
import type { AuthSession } from "@/types/route";

interface EventsMapsPageProps {
  session: AuthSession;
}

export default function EventsMapsPage(_props: EventsMapsPageProps) {
  return (
    <ComingSoon
      description="Funkcja została tymczasowo wyłączona."
      feature="Rozdawanie map"
    />
  );
}
