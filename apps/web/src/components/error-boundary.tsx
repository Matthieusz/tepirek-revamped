import { AlertCircle } from "lucide-react";
import { Component } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary component for handling React errors gracefully
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error, hasError: true };
  }

  // oxlint-disable-next-line eslint/class-methods-use-this -- React lifecycle method requires instance method signature
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  // oxlint-disable-next-line @typescript-eslint/promise-function-async
  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }

      return (
        <Card className="m-4 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Wystąpił błąd
            </CardTitle>
            <CardDescription>Przepraszamy, coś poszło nie tak.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {this.state.error !== undefined && (
              <p className="text-muted-foreground text-xs">
                {this.state.error.message}
              </p>
            )}
            <Button
              onClick={() => {
                // oxlint-disable-next-line react/no-set-state
                this.setState({ error: undefined, hasError: false });
                window.location.reload();
              }}
              size="sm"
              variant="outline"
            >
              Odśwież stronę
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
