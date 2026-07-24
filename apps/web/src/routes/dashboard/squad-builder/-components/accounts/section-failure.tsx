import { AlertTriangle, RotateCw } from "lucide-react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert";
import { Button } from "@/components/ui/button";

interface SectionFailureProps {
  readonly message: string;
  readonly onRetry: () => void;
}

/** Renders an inline section-level failure with a retry action. */
export const SectionFailure = ({ message, onRetry }: SectionFailureProps) => (
  <Alert className="m-4 w-auto" variant="destructive">
    <AlertTriangle aria-hidden="true" />
    <AlertTitle>Nie udało się wczytać danych</AlertTitle>
    <AlertDescription>{message}</AlertDescription>
    <AlertAction>
      <Button onClick={onRetry} size="sm" type="button" variant="outline">
        <RotateCw className="size-3.5" />
        Spróbuj ponownie
      </Button>
    </AlertAction>
  </Alert>
);
