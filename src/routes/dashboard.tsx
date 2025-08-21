// app/routes/dashboard.tsx
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuthActions, useCurrentUser } from '@/lib/auth'
import { getCurrentUserServer } from '@/lib/auth-server'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const user = await getCurrentUserServer()

    // If not authenticated or profile incomplete, redirect to auth
    if (!user || !user.firstName || !user.lastName) {
      throw redirect({
        to: '/auth',
      })
    }
  },
  component: DashboardComponent,
})

function DashboardComponent() {
  const navigate = useNavigate()
  const { isLoading, isAuthenticated, signOut } = useAuthActions()
  const user = useCurrentUser()

  const handleSignOut = async () => {
    await signOut()
    navigate({ to: '/auth' })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    navigate({ to: '/auth' })
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome to Rime, {user?.firstName}! 👋
            </h1>
            <p className="text-gray-600 mt-2">Your team communication hub</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">🎉 Auth Working!</CardTitle>
              <CardDescription>
                Your cookie-based authentication is live
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Phone: {user?.phone}
                <br />
                Name: {user?.firstName} {user?.lastName}
                <br />
                Status: {user?.status}
              </p>
              <p className="text-xs text-gray-500">
                Cookie-based sessions working perfectly!
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">📱 Next: Channels</CardTitle>
              <CardDescription>Team conversations</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Ready to build chat channels and real-time messaging.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">📊 Next: Analytics</CardTitle>
              <CardDescription>Team insights dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Ready to add analytics and team activity insights.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
