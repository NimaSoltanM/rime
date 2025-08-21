// app/components/MessagingApp.tsx
import React, { useState, Suspense } from 'react'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import {
  Hash,
  Users,
  Settings,
  Bell,
  MessageSquare,
  Loader2,
  Building2,
  Plus,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Import the components we'll create
import { api } from 'convex/_generated/api'
import { Id } from 'convex/_generated/dataModel'
import MessageList from './messages/message-list'
import MessageInput from './messages/message-input'
import OrganizationCreator from './organization-creator'
import WorkspaceList from './workspace-list'
import InvitationManager from './invitation-manager'

interface MessagingAppProps {
  user: {
    _id: string
    phone: string
    firstName: string
    lastName: string
    status: 'online' | 'offline'
    sessionToken: string
  }
}

export default function MessagingApp({ user }: MessagingAppProps) {
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<Id<'organizations'> | null>(null)
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<
    Id<'workspaces'> | undefined
  >(undefined)
  const [showOrgCreator, setShowOrgCreator] = useState(false)
  const [showInvitations, setShowInvitations] = useState(false)

  // Use the session token from the user prop
  const sessionToken = user.sessionToken

  // Get user's organizations (now with reliable token)
  const { data: organizations = [], isLoading: organizationsLoading } =
    useQuery({
      ...convexQuery(api.organizations.getUserOrganizations, {
        sessionToken,
      }),
      enabled: !!sessionToken, // Simplified condition since we know user is authenticated
    })

  // Get selected organization details (conditional query)
  const { data: selectedOrganization } = useQuery({
    ...convexQuery(api.organizations.getOrganization, {
      organizationId: selectedOrganizationId!,
      sessionToken,
    }),
    enabled: !!selectedOrganizationId && !!sessionToken,
  })

  // Get workspace details (conditional query)
  const { data: selectedWorkspace } = useQuery({
    ...convexQuery(api.workspaces.getWorkspace, {
      workspaceId: selectedWorkspaceId!,
      sessionToken,
    }),
    enabled: !!selectedWorkspaceId && !!sessionToken,
  })

  // Auto-select first organization if none selected
  React.useEffect(() => {
    if (!selectedOrganizationId && organizations.length > 0) {
      const firstOrg = organizations.find((org) => org !== null)
      if (firstOrg) {
        setSelectedOrganizationId(firstOrg._id)
      }
    }
  }, [organizations, selectedOrganizationId])

  // Show loading while organizations are loading
  if (organizationsLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Loading organizations...
          </p>
        </div>
      </div>
    )
  }

  const handleWorkspaceSelect = (workspaceId: Id<'workspaces'>) => {
    setSelectedWorkspaceId(workspaceId)
  }

  const handleOrganizationSwitch = (orgId: Id<'organizations'>) => {
    setSelectedOrganizationId(orgId)
    setSelectedWorkspaceId(undefined) // Reset workspace when switching org
  }

  // Show organization creator if user has no organizations
  if (organizations.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <OrganizationCreator
          onOrganizationCreated={(orgId) => setSelectedOrganizationId(orgId)}
        />
      </div>
    )
  }

  // Show organization selector if no organization selected
  if (!selectedOrganizationId || !selectedOrganization) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Card className="w-96 p-6 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Select Organization</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Choose an organization to start messaging
          </p>
          <div className="space-y-2">
            {organizations
              .filter((org): org is NonNullable<typeof org> => org !== null)
              .map((org) => (
                <Button
                  key={org._id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleOrganizationSwitch(org._id)}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  {org.name}
                  <Badge variant="secondary" className="ml-auto">
                    {org.memberCount} members
                  </Badge>
                </Button>
              ))}
          </div>
        </Card>
      </div>
    )
  }

  // Get user initials for avatar
  const userInitials =
    `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() ||
    'U'

  return (
    <TooltipProvider>
      <div className="h-screen bg-background flex flex-col">
        {/* Top Navigation Bar */}
        <Card className="rounded-none border-l-0 border-r-0 border-t-0 z-30">
          <div className="px-4 lg:px-6 py-3">
            <div className="flex items-center justify-between">
              {/* Left: Organization Switcher + Workspace Info */}
              <div className="flex items-center gap-4">
                {/* Organization Switcher */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <div className="hidden sm:block text-left">
                        <div className="text-sm font-medium">
                          {selectedOrganization.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedOrganization.memberCount} members
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Switch Organization
                    </div>
                    <DropdownMenuSeparator />
                    {organizations
                      .filter(
                        (org): org is NonNullable<typeof org> => org !== null,
                      )
                      .map((org) => (
                        <DropdownMenuItem
                          key={org._id}
                          onClick={() => handleOrganizationSwitch(org._id)}
                          className="flex items-center gap-2"
                        >
                          <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
                            <Building2 className="w-3 h-3" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {org.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {org.memberCount} members
                            </div>
                          </div>
                          {org._id === selectedOrganizationId && (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowOrgCreator(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Organization
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Current Workspace Info */}
                {selectedWorkspace && (
                  <>
                    <div className="hidden lg:block w-px h-6 bg-border" />
                    <div className="hidden lg:flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          {selectedWorkspace.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedWorkspace.memberCount} members •{' '}
                          {selectedWorkspace.messageCount} messages
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowInvitations(true)}
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Manage Members</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Bell className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>

                {/* User Avatar */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline text-sm">
                        {user.firstName} {user.lastName}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      {user.phone}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Account Settings</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Sign Out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Workspace Sidebar */}
          <Suspense
            fallback={
              <div className="w-0 lg:w-72 bg-card border-r flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <WorkspaceList
              sessionToken={sessionToken}
              organizationId={selectedOrganizationId}
              selectedWorkspaceId={selectedWorkspaceId}
              onWorkspaceSelect={handleWorkspaceSelect}
            />
          </Suspense>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedWorkspaceId && selectedWorkspace ? (
              <>
                {/* Messages */}
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
                  <MessageList
                    workspaceId={selectedWorkspaceId}
                    sessionToken={sessionToken}
                  />
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
                  <h3 className="text-lg font-medium mb-2">
                    Welcome to {selectedOrganization.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select a workspace from the sidebar to start messaging, or
                    create a new one.
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {selectedOrganization.plan} plan •{' '}
                    {selectedOrganization.memberCount} members
                  </Badge>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {showOrgCreator && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
              <OrganizationCreator
                onOrganizationCreated={(orgId) => {
                  setSelectedOrganizationId(orgId)
                  setShowOrgCreator(false)
                }}
                onCancel={() => setShowOrgCreator(false)}
              />
            </div>
          </div>
        )}

        {showInvitations && selectedOrganizationId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
              <InvitationManager
                organizationId={selectedOrganizationId}
                onClose={() => setShowInvitations(false)}
              />
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
