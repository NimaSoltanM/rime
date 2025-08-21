// app/components/WorkspaceList.tsx
import React, { useState } from 'react'
import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMutation } from 'convex/react'
import { Hash, Plus, Users, Loader2, Lock, Globe, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Id } from 'convex/_generated/dataModel'
import { api } from 'convex/_generated/api'

interface WorkspaceListProps {
  organizationId: Id<'organizations'>
  selectedWorkspaceId?: Id<'workspaces'>
  onWorkspaceSelect: (workspaceId: Id<'workspaces'>) => void
  sessionToken: string
}

export default function WorkspaceList({
  organizationId,
  selectedWorkspaceId,
  onWorkspaceSelect,
  sessionToken,
}: WorkspaceListProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    description: '',
    type: 'public' as 'public' | 'private',
    purpose: 'general' as
      | 'general'
      | 'project'
      | 'department'
      | 'client'
      | 'announcement',
  })
  const [isCreating, setIsCreating] = useState(false)

  const { data: workspaces = [] } = useSuspenseQuery(
    convexQuery(api.workspaces.getUserWorkspaces, {
      organizationId,
      sessionToken,
    }),
  )

  const createWorkspace = useMutation(api.workspaces.create)

  const handleCreateWorkspace = async () => {
    const name = newWorkspace.name.trim()
    if (!name || isCreating || !sessionToken) return

    try {
      setIsCreating(true)
      const workspaceId = await createWorkspace({
        name,
        description: newWorkspace.description.trim() || undefined,
        organizationId,
        type: newWorkspace.type,
        purpose: newWorkspace.purpose,
        sessionToken,
      })

      setNewWorkspace({
        name: '',
        description: '',
        type: 'public',
        purpose: 'general',
      })
      setShowCreateForm(false)
      onWorkspaceSelect(workspaceId)
      setMobileOpen(false)
    } catch (error) {
      console.error('Failed to create workspace:', error)
      alert('Failed to create workspace. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleWorkspaceSelect = (workspaceId: Id<'workspaces'>) => {
    onWorkspaceSelect(workspaceId)
    setMobileOpen(false)
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

  const WorkspaceContent = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Workspaces</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="space-y-3 mt-3">
            <Input
              value={newWorkspace.name}
              onChange={(e) =>
                setNewWorkspace((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Workspace name..."
              autoFocus
              disabled={isCreating}
            />

            <Textarea
              value={newWorkspace.description}
              onChange={(e) =>
                setNewWorkspace((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Description (optional)..."
              className="min-h-[60px]"
              disabled={isCreating}
            />

            <div className="grid grid-cols-2 gap-2">
              <Select
                value={newWorkspace.type}
                onValueChange={(value: 'public' | 'private') =>
                  setNewWorkspace((prev) => ({ ...prev, type: value }))
                }
                disabled={isCreating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3 h-3" />
                      Public
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3" />
                      Private
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={newWorkspace.purpose}
                onValueChange={(value: any) =>
                  setNewWorkspace((prev) => ({ ...prev, purpose: value }))
                }
                disabled={isCreating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreateWorkspace}
                disabled={!newWorkspace.name.trim() || isCreating}
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
                  setNewWorkspace({
                    name: '',
                    description: '',
                    type: 'public',
                    purpose: 'general',
                  })
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      {/* Workspaces List */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          {workspaces.length > 0 ? (
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
                  onClick={() => handleWorkspaceSelect(workspace._id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      {workspace.type === 'private' ? (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Hash className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-medium truncate">
                          {workspace.name}
                        </div>
                        {workspace.purpose !== 'general' && (
                          <Badge
                            variant="secondary"
                            className="text-xs hidden sm:inline-flex"
                          >
                            {workspace.purpose}
                          </Badge>
                        )}
                      </div>

                      {workspace.latestMessage ? (
                        <div className="text-xs text-muted-foreground truncate">
                          <span className="font-medium">
                            {workspace.latestMessage.user?.firstName ||
                              'Someone'}
                            :
                          </span>{' '}
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
                    {workspace.messageCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {workspace.messageCount > 99
                          ? '99+'
                          : workspace.messageCount}
                      </Badge>
                    )}

                    {workspace.userRole === 'admin' && (
                      <Badge
                        variant="outline"
                        className="text-xs hidden sm:inline-flex"
                      >
                        Admin
                      </Badge>
                    )}

                    {workspace.latestMessage && (
                      <div className="text-xs text-muted-foreground hidden sm:block">
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
                  Create your first workspace to start collaborating
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
    </div>
  )

  return (
    <>
      {/* Mobile: Hamburger + Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="fixed top-4 left-4 z-50 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <Card className="h-full rounded-none border-0">
            <WorkspaceContent />
          </Card>
        </SheetContent>
      </Sheet>

      {/* Desktop: Fixed Sidebar */}
      <Card className="hidden lg:block w-72 h-full rounded-none border-l-0 border-t-0 border-b-0">
        <WorkspaceContent />
      </Card>
    </>
  )
}
