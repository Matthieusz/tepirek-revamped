import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/events/heroes')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/events/hero-list"!</div>
}
