// app/components/WorkspaceList.tsx
import React, { useState } from 'react'
import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMutation } from 'convex/react'

import { useAuthActions } from '@/lib/auth' // ← ADD THIS IMPORT
import { Hash, Plus, Users, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Id } from 'convex/_generated/dataModel'
import { api } from 'convex/_generated/api'

interface WorkspaceListProps {
  selectedWorkspaceId?: Id<'workspaces'>
  onWorkspaceSelect: (workspaceId: Id<'workspaces'>) => void
}

export default function WorkspaceList({
  selectedWorkspaceId,
  onWorkspaceSelect,
}: WorkspaceListProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Get session token for auth
  const { sessionToken } = useAuthActions()

  // Real-time workspaces
  const { data: workspaces } = useSuspenseQuery(
    convexQuery(api.workspaces.get, {}),
  )

  // Create workspace mutation
  const createWorkspace = useMutation(api.workspaces.create)

  const handleCreateWorkspace = async () => {
    const name = newWorkspaceName.trim()
    if (!name || isCreating || !sessionToken) return

    try {
      setIsCreating(true)
      const workspaceId = await createWorkspace({
        name,
        sessionToken, // ← PASS SESSION TOKEN
      })

      // Clear form and close
      setNewWorkspaceName('')
      setShowCreateForm(false)

      // Select the new workspace
      onWorkspaceSelect(workspaceId)
    } catch (error) {
      console.error('Failed to create workspace:', error)
      alert('Failed to create workspace. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreateWorkspace()
    } else if (e.key === 'Escape') {
      setShowCreateForm(false)
      setNewWorkspaceName('')
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    }
  }

  return (
    <Card className="w-72 h-full rounded-none border-l-0 border-t-0 border-b-0">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Workspaces</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Create workspace form */}
        {showCreateForm && (
          <div className="space-y-2 mt-3">
            <Input
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Workspace name..."
              autoFocus
              disabled={isCreating}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleCreateWorkspace}
                disabled={!newWorkspaceName.trim() || isCreating}
                size="sm"
                className="flex-1"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCreateForm(false)
                  setNewWorkspaceName('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      {/* Workspaces List */}
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-180px)]">
          {workspaces && workspaces.length > 0 ? (
            <div className="p-4 space-y-1">
              {workspaces.map((workspace) => (
                <Button
                  key={workspace._id}
                  variant={
                    selectedWorkspaceId === workspace._id
                      ? 'secondary'
                      : 'ghost'
                  }
                  className="w-full justify-start h-auto p-3"
                  onClick={() => onWorkspaceSelect(workspace._id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-medium truncate">
                        {workspace.name}
                      </div>

                      {/* Latest message preview */}
                      {workspace.latestMessage ? (
                        <div className="text-xs text-muted-foreground truncate">
                          {workspace.latestMessage.text}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          No messages yet
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                    {/* Message count */}
                    {workspace.messageCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {workspace.messageCount}
                      </Badge>
                    )}

                    {/* Last activity time */}
                    {workspace.latestMessage && (
                      <div className="text-xs text-muted-foreground">
                        {formatTime(workspace.latestMessage.createdAt)}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium mb-1">No workspaces yet</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Create your first workspace to start messaging
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateForm(true)}
                >
                  Create Workspace
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
