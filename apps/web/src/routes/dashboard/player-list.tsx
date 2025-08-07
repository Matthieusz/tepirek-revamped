import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/player-list')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/player-list"!</div>
}
