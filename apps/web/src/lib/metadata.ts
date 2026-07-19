const APPLICATION_NAME = "Tepirek Revamped";

/**
 * Creates a route-specific document title while keeping the application name
 * visible in browser tabs and history.
 */
export const createPageTitle = (pageName: string): string =>
  `${pageName} | ${APPLICATION_NAME}`;
