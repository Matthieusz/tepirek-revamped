import "@tanstack/react-router";

declare module "@tanstack/react-router" {
  // biome-ignore lint: Module augmentation requires interface
  interface StaticDataRouteOption {
    crumb?: string;
  }
}
