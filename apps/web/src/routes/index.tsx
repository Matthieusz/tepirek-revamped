import { createFileRoute } from "@tanstack/react-router";

import { createPageTitle } from "@/lib/metadata";

import HomePage from "./-components/home-page";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [{ title: createPageTitle("Strona główna") }],
  }),
});
