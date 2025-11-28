import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());

  let statusText: string;
  if (healthCheck.isLoading) {
    statusText = "Sprawdzanie...";
  } else if (healthCheck.data) {
    statusText = "Połączono";
  } else {
    statusText = "Rozłączono";
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Hero Card */}
        <Card className="border-none bg-linear-to-br from-primary/15 via-primary/5 to-transparent">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Tepirek Revamped ⚔️</CardTitle>
            <CardDescription className="text-base">
              Strona klanowa Gildii Złodziei
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild size="lg">
              <Link className="gap-2" to="/login">
                <LogIn className="size-4" />
                Zaloguj się
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link className="gap-2" to="/signup">
                <UserPlus className="size-4" />
                Utwórz konto
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="font-medium text-sm">Status API</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={`size-2.5 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"} ${healthCheck.isLoading ? "animate-pulse" : ""}`}
              />
              <span className="text-muted-foreground text-sm">
                {statusText}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
