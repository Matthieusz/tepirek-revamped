"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      className="toaster group"
      style={
        // oxlint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        {
          "--normal-bg": "var(--popover)",
          "--normal-border": "var(--border)",
          "--normal-text": "var(--popover-foreground)",
        } as React.CSSProperties
      }
      // oxlint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      theme={theme as ToasterProps["theme"]}
      {...props}
    />
  );
};

export { Toaster };
