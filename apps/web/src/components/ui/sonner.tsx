import {
  CheckmarkCircle02Icon,
  InfoIcon,
  LoaderCircleIcon,
  AlertCircleIcon,
  TriangleAlertIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        error: (
          <HugeiconsIcon
            aria-hidden="true"
            icon={AlertCircleIcon}
            className="size-4"
          />
        ),
        info: (
          <HugeiconsIcon
            aria-hidden="true"
            icon={InfoIcon}
            className="size-4"
          />
        ),
        loading: (
          <HugeiconsIcon
            aria-hidden="true"
            icon={LoaderCircleIcon}
            className="size-4 animate-spin"
          />
        ),
        success: (
          <HugeiconsIcon
            aria-hidden="true"
            icon={CheckmarkCircle02Icon}
            className="size-4"
          />
        ),
        warning: (
          <HugeiconsIcon
            aria-hidden="true"
            icon={TriangleAlertIcon}
            className="size-4"
          />
        ),
      }}
      style={
        {
          "--border-radius": "var(--radius)",
          "--normal-bg": "var(--popover)",
          "--normal-border": "var(--border)",
          "--normal-text": "var(--popover-foreground)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
