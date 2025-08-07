import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/auctions/main')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/auctions/main"!</div>
}
