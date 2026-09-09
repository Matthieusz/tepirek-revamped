import {
  Link02Icon,
  LogInIcon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { healthQueryOptions } from "@/features/health/health-queries";
import { getErrorMessage } from "@/lib/errors";

const HomeContent = ({
  healthCheckIsLoading,
}: {
  readonly healthCheckIsLoading: boolean;
}) => {
  let statusText: string;
  let statusColor = "text-muted-foreground";
  let statusDot = "bg-[oklch(0.76_0.10_80)]";

  if (healthCheckIsLoading) {
    statusText = "Sprawdzanie...";
    statusDot = "bg-[oklch(0.76_0.10_80)]";
  } else {
    statusText = "Status";
    statusColor = "text-primary";
    statusDot = "bg-primary";
  }

  return (
    <div className="bg-background relative flex min-h-svh flex-col items-center justify-center overflow-hidden">
      <main className="relative z-10 flex flex-col items-center gap-10 px-6 text-center">
        {/* Title */}
        <div className="flex flex-col items-center gap-3">
          <h1
            className="text-foreground font-serif font-bold tracking-tight"
            style={{
              fontSize: "clamp(3.5rem, 10vw, 7rem)",
              lineHeight: 1.05,
            }}
          >
            Tepirek{" "}
            <span className="text-muted-foreground font-light">Revamped</span>
          </h1>
          <p className="text-muted-foreground max-w-[28ch] text-lg leading-relaxed">
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
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={LogInIcon}
                  className="size-5"
                />
                Zaloguj się
              </Link>
            }
            className="h-12 w-full text-base font-semibold tracking-wide"
            size="lg"
          />
          <Button
            render={
              <Link
                className="flex w-full items-center justify-center gap-2"
                to="/signup"
              >
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={UserAdd01Icon}
                  className="size-5"
                />
                Utwórz konto
              </Link>
            }
            className="h-12 w-full text-base font-semibold tracking-wide"
            size="lg"
            variant="outline"
          />
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2.5 text-sm">
          <span className="relative flex size-2">
            {healthCheckIsLoading && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[oklch(0.76_0.10_80)] opacity-60" />
            )}
            <span
              className={`relative inline-flex size-2 rounded-full ${statusDot}`}
            />
          </span>
          <span
            className={`font-mono text-xs tracking-widest uppercase ${statusColor}`}
          >
            {statusText}
          </span>
          <a
            href="https://uptime.informati.dev/status/overview"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Status strony"
            className="text-muted-foreground hover:text-foreground inline-flex min-h-6 min-w-6 items-center justify-center transition-colors"
          >
            <HugeiconsIcon
              aria-hidden="true"
              icon={Link02Icon}
              className="size-3.5"
            />
          </a>
        </div>
      </main>
    </div>
  );
};

const HomePage = (): ReactNode => {
  const healthQuery = useQuery(healthQueryOptions());

  if (healthQuery.isPending) {
    return <LoadingSpinner />;
  }

  if (healthQuery.isError) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <QueryErrorState
          message={getErrorMessage(
            healthQuery.error,
            "Nie udało się wczytać danych. Spróbuj ponownie."
          )}
          onRetry={() => {
            void healthQuery.refetch();
          }}
        />
      </div>
    );
  }

  return <HomeContent healthCheckIsLoading={healthQuery.isFetching} />;
};

export default HomePage;
