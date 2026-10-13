import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Presents an accessible inline notice or destructive error. */
export const Alert = ({
  className,
  variant = "default",
  ...props
}: ComponentProps<"div"> & {
  readonly variant?: "default" | "destructive";
}) => (
  <div
    data-slot="alert"
    role="alert"
    className={cn(
      "bg-card text-card-foreground relative grid w-full grid-cols-[0_1fr] gap-y-1 rounded-lg border p-4 text-sm has-[>svg]:grid-cols-[1rem_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4",
      variant === "destructive" &&
        "text-destructive [&_[data-slot=alert-description]]:text-destructive/90",
      className
    )}
    {...props}
  />
);

/** Labels an inline notice. */
export const AlertTitle = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    data-slot="alert-title"
    className={cn("col-start-2 min-w-0 font-medium tracking-tight", className)}
    {...props}
  />
);

/** Contains notice details. */
export const AlertDescription = ({
  className,
  ...props
}: ComponentProps<"div">) => (
  <div
    data-slot="alert-description"
    className={cn(
      "text-muted-foreground col-start-2 grid gap-1 text-sm [&_p]:leading-relaxed",
      className
    )}
    {...props}
  />
);

/** Places recovery controls after the notice details. */
export const AlertAction = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    data-slot="alert-action"
    className={cn("col-start-2 mt-2 flex flex-wrap gap-2", className)}
    {...props}
  />
);
