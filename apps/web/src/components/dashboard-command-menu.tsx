import {
  Moon02Icon,
  Search01Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { isCommandMenuHotkey } from "@/components/dashboard-command-menu-hotkey";
import {
  dashboardNavigationGroups,
  dashboardOtherNavigationItems,
} from "@/components/dashboard-navigation";
import type {
  DashboardNavigationGroup,
  DashboardNavigationItem,
} from "@/components/dashboard-navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const THEME_COMMAND_KEY = "theme";
const DIACRITIC_MARK_PATTERN = /\p{Mark}/gu;

const routeCommandGroups: readonly DashboardNavigationGroup[] = [
  ...dashboardNavigationGroups,
  {
    icon: Search01Icon,
    items: dashboardOtherNavigationItems,
    title: "Inne",
  },
];

const normalizeSearchValue = (value: string): string =>
  value
    .normalize("NFD")
    .replace(DIACRITIC_MARK_PATTERN, "")
    .toLocaleLowerCase("pl");

const matchesQuery = (values: readonly string[], query: string): boolean => {
  const normalizedQuery = normalizeSearchValue(query.trim());
  if (normalizedQuery.length === 0) {
    return true;
  }

  return values.some((value) =>
    normalizeSearchValue(value).includes(normalizedQuery)
  );
};

const getVisibleRouteGroups = (
  query: string
): readonly DashboardNavigationGroup[] =>
  routeCommandGroups.flatMap((group) => {
    const items = group.items.filter(
      (item) =>
        item.disabled !== true &&
        matchesQuery([group.title, item.title, item.url], query)
    );

    return items.length === 0 ? [] : [{ ...group, items }];
  });

const isThemeCommandVisible = (query: string): boolean =>
  matchesQuery(["Motyw", "Przełącz motyw", "jasny", "ciemny", "wygląd"], query);

const getVisibleCommandKeys = (
  groups: readonly DashboardNavigationGroup[],
  showThemeCommand: boolean
): readonly string[] => {
  const keys = groups.flatMap((group) => group.items.map((item) => item.url));
  return showThemeCommand ? [...keys, THEME_COMMAND_KEY] : keys;
};

const getCommandOptionId = (key: string): string =>
  `dashboard-command-${key.replaceAll("/", "-")}`;

const getNextCommandKey = (
  commandKeys: readonly string[],
  activeKey: string | null,
  direction: 1 | -1
): string | null => {
  if (commandKeys.length === 0) {
    return null;
  }

  const currentIndex = commandKeys.indexOf(activeKey ?? "");
  if (currentIndex === -1) {
    const edgeIndex = direction === 1 ? 0 : commandKeys.length - 1;
    return commandKeys[edgeIndex] ?? null;
  }

  const nextIndex =
    (currentIndex + direction + commandKeys.length) % commandKeys.length;
  return commandKeys[nextIndex] ?? null;
};

const RouteCommand = ({
  active,
  group,
  item,
  onActivate,
  onSelect,
  registerOption,
}: {
  readonly active: boolean;
  readonly group: DashboardNavigationGroup;
  readonly item: DashboardNavigationItem;
  readonly onActivate: (key: string) => void;
  readonly onSelect: () => void;
  readonly registerOption: (node: HTMLElement | null) => void;
}) => {
  const Icon = item.icon ?? group.icon;

  return (
    <Link
      aria-selected={active}
      className={cn(
        "focus-visible:ring-ring focus-visible:bg-accent focus-visible:text-accent-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        active && "bg-accent text-accent-foreground"
      )}
      id={getCommandOptionId(item.url)}
      onClick={onSelect}
      onPointerMove={() => onActivate(item.url)}
      ref={registerOption}
      role="option"
      to={item.url}
    >
      <HugeiconsIcon
        aria-hidden="true"
        className="text-muted-foreground size-4"
        icon={Icon}
      />
      <span>{item.title}</span>
    </Link>
  );
};

/** Dashboard route search, keyboard navigation, and quick actions. */
export const DashboardCommandMenu = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [activeKey, setActiveKey] = useState<string | null>(
    dashboardNavigationGroups[0]?.items[0]?.url ?? null
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const optionRefs = useRef(new Map<string, HTMLElement>());
  const visibleGroups = getVisibleRouteGroups(query);
  const showThemeCommand = isThemeCommandVisible(query);
  const visibleCommandKeys = getVisibleCommandKeys(
    visibleGroups,
    showThemeCommand
  );
  const themeIcon = resolvedTheme === "dark" ? Sun03Icon : Moon02Icon;
  const themeDescription =
    resolvedTheme === "dark" ? "Włącz jasny motyw" : "Włącz ciemny motyw";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isCommandMenuHotkey(event)) {
        return;
      }

      event.preventDefault();
      if (!open) {
        setQuery("");
        setActiveKey(dashboardNavigationGroups[0]?.items[0]?.url ?? null);
      }
      setOpen(!open);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const openMenu = () => {
    setQuery("");
    setActiveKey(dashboardNavigationGroups[0]?.items[0]?.url ?? null);
    setOpen(true);
  };

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.currentTarget.value;
    const nextGroups = getVisibleRouteGroups(nextQuery);
    const nextShowThemeCommand = isThemeCommandVisible(nextQuery);
    const [firstCommandKey] = getVisibleCommandKeys(
      nextGroups,
      nextShowThemeCommand
    );

    setQuery(nextQuery);
    setActiveKey(firstCommandKey ?? null);
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextActiveKey = getNextCommandKey(
        visibleCommandKeys,
        activeKey,
        event.key === "ArrowDown" ? 1 : -1
      );
      setActiveKey(nextActiveKey);
      if (nextActiveKey !== null) {
        optionRefs.current
          .get(nextActiveKey)
          ?.scrollIntoView({ block: "nearest" });
      }
      return;
    }

    if (event.key === "Enter" && activeKey !== null) {
      event.preventDefault();
      optionRefs.current.get(activeKey)?.click();
    }
  };

  const registerOption =
    (key: string) =>
    (node: HTMLElement | null): void => {
      if (node === null) {
        optionRefs.current.delete(key);
        return;
      }
      optionRefs.current.set(key, node);
    };

  const selectTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
    setOpen(false);
  };

  return (
    <>
      <Button
        aria-label="Otwórz menu poleceń"
        className="mr-4 gap-2"
        onClick={openMenu}
        size="sm"
        variant="outline"
      >
        <HugeiconsIcon
          aria-hidden="true"
          className="size-4"
          icon={Search01Icon}
        />
        <span className="hidden sm:inline">Szukaj</span>
        <kbd className="bg-muted text-muted-foreground hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </Button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent
          className="gap-0 overflow-hidden p-0 sm:max-w-xl"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Menu poleceń</DialogTitle>
          <DialogDescription className="sr-only">
            Wyszukaj stronę panelu lub wybierz szybką akcję.
          </DialogDescription>
          <div className="flex items-center gap-2 px-4">
            <HugeiconsIcon
              aria-hidden="true"
              className="text-muted-foreground size-4 shrink-0"
              icon={Search01Icon}
            />
            <input
              aria-activedescendant={
                activeKey === null ? undefined : getCommandOptionId(activeKey)
              }
              aria-controls="dashboard-command-list"
              aria-expanded="true"
              aria-label="Wyszukaj polecenie"
              autoComplete="off"
              className="placeholder:text-muted-foreground h-12 w-full bg-transparent text-sm outline-none"
              onChange={handleQueryChange}
              onKeyDown={handleInputKeyDown}
              placeholder="Wpisz nazwę strony lub polecenia…"
              role="combobox"
              value={query}
            />
          </div>
          <div
            className="max-h-80 overflow-y-auto p-2"
            id="dashboard-command-list"
            role="listbox"
          >
            {visibleCommandKeys.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Nie znaleziono poleceń.
              </p>
            ) : null}
            {visibleGroups.map((group) => (
              <div
                aria-label={group.title}
                className="pb-2"
                key={group.title}
                role="group"
              >
                <div className="text-muted-foreground px-3 py-1.5 text-xs font-medium">
                  {group.title}
                </div>
                {group.items.map((item) => (
                  <RouteCommand
                    active={activeKey === item.url}
                    group={group}
                    item={item}
                    key={item.url}
                    onActivate={setActiveKey}
                    onSelect={() => setOpen(false)}
                    registerOption={registerOption(item.url)}
                  />
                ))}
              </div>
            ))}
            {showThemeCommand ? (
              <div aria-label="Ustawienia" className="pb-2" role="group">
                <div className="text-muted-foreground px-3 py-1.5 text-xs font-medium">
                  Ustawienia
                </div>
                <button
                  aria-selected={activeKey === THEME_COMMAND_KEY}
                  className={cn(
                    "focus-visible:ring-ring focus-visible:bg-accent focus-visible:text-accent-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    activeKey === THEME_COMMAND_KEY &&
                      "bg-accent text-accent-foreground"
                  )}
                  id={getCommandOptionId(THEME_COMMAND_KEY)}
                  onClick={selectTheme}
                  onPointerMove={() => setActiveKey(THEME_COMMAND_KEY)}
                  ref={registerOption(THEME_COMMAND_KEY)}
                  role="option"
                  type="button"
                >
                  <HugeiconsIcon
                    aria-hidden="true"
                    className="text-muted-foreground size-4"
                    icon={themeIcon}
                  />
                  <span className="flex flex-col">
                    <span>Przełącz motyw</span>
                    <span className="text-muted-foreground text-xs">
                      {themeDescription}
                    </span>
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
