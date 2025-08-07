import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/events/ranking')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/events/ranking"!</div>
}
