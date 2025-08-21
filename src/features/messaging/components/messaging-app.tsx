// app/components/MessagingApp.tsx
import React, { useState, Suspense } from 'react'
import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/lib/auth' // Your existing auth hook
import {
  Hash,
  Users,
  Settings,
  Bell,
  MessageSquare,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

// Import the components we'll create
import { api } from 'convex/_generated/api'
import { Id } from 'convex/_generated/dataModel' // ← ADD THIS IMPORT
import WorkspaceList from './workspace-list'
import MessageList from './message-list'
import MessageInput from './message-input'

export default function MessagingApp() {
  // ← USE undefined INSTEAD OF EMPTY STRING
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<
    Id<'workspaces'> | undefined
  >(undefined)
  const currentUser = useCurrentUser()

  // Get workspaces to auto-select first one
  const { data: workspaces } = useSuspenseQuery(
    convexQuery(api.workspaces.get, {}),
  )

  // Auto-select first workspace if none selected
  React.useEffect(() => {
    if (!selectedWorkspaceId && workspaces && workspaces.length > 0) {
      setSelectedWorkspaceId(workspaces[0]._id)
    }
  }, [workspaces, selectedWorkspaceId])

  // Get selected workspace details
  const selectedWorkspace = workspaces?.find(
    (w) => w._id === selectedWorkspaceId,
  )

  // ← FIX THE PARAMETER TYPE HERE
  const handleWorkspaceSelect = (workspaceId: Id<'workspaces'>) => {
    setSelectedWorkspaceId(workspaceId)
  }

  return (
    <div className="h-screen bg-background flex">
      {/* Workspace Sidebar */}
      <Suspense
        fallback={
          <div className="w-72 bg-card border-r flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <WorkspaceList
          selectedWorkspaceId={selectedWorkspaceId}
          onWorkspaceSelect={handleWorkspaceSelect}
        />
      </Suspense>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedWorkspaceId && selectedWorkspace ? (
          <>
            {/* Workspace Header */}
            <Card className="rounded-none border-l-0 border-r-0 border-t-0">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <Hash className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        {selectedWorkspace.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedWorkspace.description || 'Team workspace'}
                        {selectedWorkspace.messageCount > 0 && (
                          <span className="ml-2">
                            • {selectedWorkspace.messageCount} messages
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm">
                      <Users className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Bell className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Messages Area */}
            <Suspense
              fallback={
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Loading messages...
                    </p>
                  </div>
                </div>
              }
            >
              <MessageList workspaceId={selectedWorkspaceId} />
            </Suspense>

            {/* Message Input */}
            <MessageInput
              workspaceId={selectedWorkspaceId}
              workspaceName={selectedWorkspace.name}
            />
          </>
        ) : (
          /* No workspace selected */
          <div className="flex-1 flex items-center justify-center">
            <Card className="w-96 text-center p-8">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Welcome to Rime</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select a workspace from the sidebar to start messaging
              </p>
              {workspaces && workspaces.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Create your first workspace to get started!
                </p>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* User Status Bar */}
      <Card className="absolute bottom-4 left-4 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-foreground">
            {currentUser?.firstName || 'User'} • Online
          </span>
        </div>
      </Card>
    </div>
  )
}
