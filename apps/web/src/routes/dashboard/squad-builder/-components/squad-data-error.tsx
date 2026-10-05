import { RotateCw, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert";
import { Button } from "@/components/ui/button";

/** Reports a failed squad-data query while keeping retry and unaffected content available. */
export const SquadDataError = ({
  children,
  onRetry,
  title,
}: {
  readonly children: ReactNode;
  readonly onRetry: () => void;
  readonly title: string;
}) => (
  <Alert className="m-4" variant="destructive">
    <AlertTriangle aria-hidden="true" />
    <AlertTitle>{title}</AlertTitle>
    <AlertDescription>{children}</AlertDescription>
    <AlertAction>
      <Button onClick={onRetry} size="sm" type="button" variant="outline">
        <RotateCw aria-hidden="true" className="size-3.5" />
        Spróbuj ponownie
      </Button>
    </AlertAction>
  </Alert>
);
