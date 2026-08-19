/** Returns whether an event represents the dashboard command-menu shortcut. */
export const isCommandMenuHotkey = (event: KeyboardEvent): boolean =>
  event.key.toLowerCase() === "k" &&
  (event.ctrlKey || event.metaKey) &&
  !event.altKey &&
  !event.shiftKey &&
  !event.repeat;
