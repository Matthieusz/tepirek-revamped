import { getRouteApi, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SquadBuilderEditorContent } from "@/features/squad-builder/editor/squad-editor";

const routeApi = getRouteApi("/dashboard/squad-builder/squads_/$groupId");

const SquadBuilderEditorPage = () => {
  const { groupId } = routeApi.useLoaderData();

  if (groupId === null) {
    return (
      <Alert variant="destructive">
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>Nieprawidłowy identyfikator grupy składów</AlertTitle>
        <AlertDescription>
          <Link
            className="underline underline-offset-4"
            to="/dashboard/squad-builder/squads"
          >
            Wróć do listy grup.
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return <SquadBuilderEditorContent groupId={groupId} />;
};

export default SquadBuilderEditorPage;
