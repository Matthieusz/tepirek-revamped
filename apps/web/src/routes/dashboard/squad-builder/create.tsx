import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/squad-builder/create')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/squad-builder/create-new"!</div>
}
