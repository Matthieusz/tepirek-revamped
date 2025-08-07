import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/events/bets/add')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/events/create-new"!</div>
}
