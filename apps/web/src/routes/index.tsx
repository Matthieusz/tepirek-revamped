import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Link2, LogIn, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());

  let statusText: string;
  let statusColor = "text-muted-foreground";
  let statusDot = "bg-[oklch(0.76_0.10_80)]";

  if (healthCheck.isLoading) {
    statusText = "Sprawdzanie...";
    statusDot = "bg-[oklch(0.76_0.10_80)]";
  } else if (healthCheck.data === undefined) {
    statusText = "Status";
    statusColor = "text-destructive";
    statusDot = "bg-destructive";
  } else {
    statusText = "Status";
    statusColor = "text-primary";
    statusDot = "bg-primary";
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background">
      <main className="relative z-10 flex flex-col items-center gap-10 px-6 text-center">
        {/* Title */}
        <div className="flex flex-col items-center gap-3">
          <h1
            className="font-serif font-bold tracking-tight text-foreground"
            style={{
              fontSize: "clamp(3.5rem, 10vw, 7rem)",
              lineHeight: 1.05,
            }}
          >
            Tepirek{" "}
            <span className="font-light text-muted-foreground">Revamped</span>
          </h1>
          <p className="max-w-[28ch] text-muted-foreground text-lg leading-relaxed">
            Strona klanowa Gildii Złodziei.
          </p>
        </div>

        {/* Auth actions */}
        <div className="flex w-full max-w-[18rem] flex-col gap-3">
          <Button
            render={
              <Link
                className="flex w-full items-center justify-center gap-2"
                to="/login"
              >
                <LogIn className="size-5" />
                Zaloguj się
              </Link>
            }
            className="h-12 w-full font-semibold text-base tracking-wide"
            size="lg"
          />
          <Button
            render={
              <Link
                className="flex w-full items-center justify-center gap-2"
                to="/signup"
              >
                <UserPlus className="size-5" />
                Utwórz konto
              </Link>
            }
            className="h-12 w-full font-semibold text-base tracking-wide"
            size="lg"
            variant="outline"
          />
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2.5 text-sm">
          <span className="relative flex size-2">
            {healthCheck.isLoading && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[oklch(0.76_0.10_80)] opacity-60" />
            )}
            <span
              className={`relative inline-flex size-2 rounded-full ${statusDot}`}
            />
          </span>
          <span
            className={`font-mono text-xs uppercase tracking-widest ${statusColor}`}
          >
            {statusText}
          </span>
          <a
            href="https://uptime.informati.dev/status/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Status strony"
          >
            <Link2 className="size-3.5" />
          </a>
        </div>
      </main>
    </div>
  );
}
