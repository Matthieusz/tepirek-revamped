import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/auctions/support')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/auctions/support"!</div>
}
