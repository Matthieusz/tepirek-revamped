import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type { ComponentProps } from "react";
import { useEffect } from "react";

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

const isThemeShortcut = (event: KeyboardEvent): boolean =>
  event.key.toLowerCase() === "d" &&
  event.shiftKey &&
  (event.ctrlKey || event.metaKey) &&
  !event.altKey &&
  !event.repeat;

/**
 * Returns whether a keyboard event target should be ignored by the theme
 * shortcut in the current editing context.
 */
export const shouldIgnoreThemeShortcutTarget = (
  target: EventTarget | null
): boolean => {
  if (typeof Element === "undefined" || !(target instanceof Element)) {
    return false;
  }

  return target.closest("input, textarea, select, [contenteditable]") !== null;
};

const ThemeShortcut = () => {
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !isThemeShortcut(event) ||
        shouldIgnoreThemeShortcutTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resolvedTheme, setTheme]);

  return null;
};

/**
 * Provides class-based light and dark themes, system preference detection,
 * persisted choices, and the global theme keyboard shortcut.
 */
export const ThemeProvider = ({ children, ...props }: ThemeProviderProps) => (
  <NextThemesProvider {...props}>
    <ThemeShortcut />
    {children}
  </NextThemesProvider>
);
