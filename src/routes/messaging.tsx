import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUserServer } from '@/lib/auth-server'
import MessagingApp from '@/features/messaging/components/messaging-app'

export const Route = createFileRoute('/messaging')({
  // Protect the route with auth
  beforeLoad: async () => {
    const user = await getCurrentUserServer()
    if (!user) throw redirect({ to: '/auth' })
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="h-screen">
      <MessagingApp />
    </div>
  )
}
