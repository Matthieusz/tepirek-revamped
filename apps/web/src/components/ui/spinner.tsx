import { LoaderCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";

function Spinner({
  className,
  strokeWidth,
  ...props
}: React.ComponentProps<"svg">) {
  const normalizedStrokeWidth =
    typeof strokeWidth === "number"
      ? strokeWidth
      : typeof strokeWidth === "string"
        ? Number(strokeWidth)
        : undefined;
  const strokeProps =
    normalizedStrokeWidth === undefined || Number.isNaN(normalizedStrokeWidth)
      ? {}
      : { strokeWidth: normalizedStrokeWidth };

  return (
    <HugeiconsIcon
      icon={LoaderCircleIcon}
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...strokeProps}
      {...props}
    />
  );
}

export { Spinner };
