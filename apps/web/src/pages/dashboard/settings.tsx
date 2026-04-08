import { ComingSoon } from "@/components/coming-soon";
import type { AuthSession } from "@/types/route";

interface SettingsPageProps {
  session: AuthSession;
}

export default function SettingsPage(_props: SettingsPageProps) {
  return <ComingSoon feature="Ustawienia" />;
}
