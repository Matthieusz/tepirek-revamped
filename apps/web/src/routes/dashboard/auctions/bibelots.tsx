import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/auctions/bibelots')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/auctions/gadgets"!</div>
}
