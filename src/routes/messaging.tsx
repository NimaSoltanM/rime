import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUserServer } from '@/lib/auth-server'
import MessagingApp from '@/features/messaging/components/messaging-app'

export const Route = createFileRoute('/messaging')({
  // Protect the route with auth and return user data
  beforeLoad: async () => {
    const user = await getCurrentUserServer()
    if (!user) throw redirect({ to: '/auth' })

    // Return the user data to make it available to the component
    return {
      user,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  // Access the user data from the route context
  const { user } = Route.useRouteContext()

  return (
    <div className="h-screen">
      <MessagingApp user={user} />
    </div>
  )
}
