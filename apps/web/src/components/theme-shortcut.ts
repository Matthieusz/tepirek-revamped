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
