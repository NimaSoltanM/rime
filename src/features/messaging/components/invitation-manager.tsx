// app/components/InvitationManager.tsx
import React, { useState } from 'react'
import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMutation } from 'convex/react'
import { useAuthActions } from '@/lib/auth'
import {
  Users,
  UserPlus,
  Mail,
  MoreVertical,
  Crown,
  Shield,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { api } from 'convex/_generated/api'
import { Id } from 'convex/_generated/dataModel'

interface InvitationManagerProps {
  organizationId: Id<'organizations'>
  onClose: () => void
}

export default function InvitationManager({
  organizationId,
  onClose,
}: InvitationManagerProps) {
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'member' as 'admin' | 'member' | 'guest',
    canCreateWorkspaces: false,
    canInviteMembers: false,
    personalMessage: '',
  })
  const [isInviting, setIsInviting] = useState(false)

  const { sessionToken } = useAuthActions()

  // Get organization members
  const { data: members = [] } = useSuspenseQuery(
    convexQuery(api.organizations.getOrganizationMembers, {
      organizationId,
      sessionToken: sessionToken || '',
    }),
  )

  // Get pending invitations
  const { data: invitations = [] } = useSuspenseQuery(
    convexQuery(api.organizations.getOrganizationInvitations, {
      organizationId,
      sessionToken: sessionToken || '',
    }),
  )

  // Mutations
  const createInvitation = useMutation(
    api.invitations.createOrganizationInvitation,
  )
  const revokeInvitation = useMutation(
    api.invitations.revokeOrganizationInvitation,
  )
  const updateMemberRole = useMutation(api.members.updateOrganizationMemberRole)
  const removeMember = useMutation(api.members.removeFromOrganization)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionToken || isInviting) return

    const {
      email,
      firstName,
      lastName,
      role,
      canCreateWorkspaces,
      canInviteMembers,
      personalMessage,
    } = inviteForm

    if (!email.trim()) {
      alert('Email is required')
      return
    }

    try {
      setIsInviting(true)
      const result = await createInvitation({
        organizationId,
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        role,
        canCreateWorkspaces,
        canInviteMembers,
        personalMessage: personalMessage.trim() || undefined,
        sessionToken,
      })

      // Reset form
      setInviteForm({
        email: '',
        firstName: '',
        lastName: '',
        role: 'member',
        canCreateWorkspaces: false,
        canInviteMembers: false,
        personalMessage: '',
      })

      alert(
        `Invitation sent! Share this link: ${window.location.origin}/invite/${result.inviteToken}`,
      )
    } catch (error: any) {
      console.error('Failed to send invitation:', error)
      alert(error.message || 'Failed to send invitation. Please try again.')
    } finally {
      setIsInviting(false)
    }
  }

  const handleRevokeInvitation = async (
    invitationId: Id<'organizationInvitations'>,
  ) => {
    if (!sessionToken) return

    try {
      await revokeInvitation({ invitationId, sessionToken })
    } catch (error: any) {
      console.error('Failed to revoke invitation:', error)
      alert('Failed to revoke invitation. Please try again.')
    }
  }

  const handleUpdateMemberRole = async (
    memberId: Id<'users'>,
    role: 'owner' | 'admin' | 'member' | 'guest',
    permissions: { canCreateWorkspaces?: boolean; canInviteMembers?: boolean },
  ) => {
    if (!sessionToken) return

    try {
      await updateMemberRole({
        organizationId,
        memberId,
        role,
        ...permissions,
        sessionToken,
      })
    } catch (error: any) {
      console.error('Failed to update member role:', error)
      alert('Failed to update member role. Please try again.')
    }
  }

  const handleRemoveMember = async (memberId: Id<'users'>) => {
    if (!sessionToken) return

    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      await removeMember({
        organizationId,
        memberId,
        sessionToken,
      })
    } catch (error: any) {
      console.error('Failed to remove member:', error)
      alert('Failed to remove member. Please try again.')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />
      default:
        return <User className="w-4 h-4 text-gray-500" />
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default'
      case 'admin':
        return 'secondary'
      case 'guest':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U'
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Manage Members</CardTitle>
              <p className="text-sm text-muted-foreground">
                Invite people and manage permissions
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="members">
              Members ({members.length})
            </TabsTrigger>
            <TabsTrigger value="invitations">
              Invitations ({invitations.length})
            </TabsTrigger>
            <TabsTrigger value="invite">Invite People</TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {getInitials(
                            member.user?.firstName,
                            member.user?.lastName,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {member.user?.firstName} {member.user?.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {member.user?.email}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {getRoleIcon(member.role)}
                            <span className="ml-1">{member.role}</span>
                          </Badge>
                          {member.canCreateWorkspaces && (
                            <Badge variant="outline" className="text-xs">
                              Can create workspaces
                            </Badge>
                          )}
                          {member.canInviteMembers && (
                            <Badge variant="outline" className="text-xs">
                              Can invite
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">
                        Joined {formatTime(member.joinedAt)}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateMemberRole(member.userId, 'admin', {})
                            }
                            disabled={member.role === 'admin'}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateMemberRole(
                                member.userId,
                                'member',
                                {},
                              )
                            }
                            disabled={member.role === 'member'}
                          >
                            <User className="w-4 h-4 mr-2" />
                            Make Member
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={member.role === 'owner'}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invitations" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {invitations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="w-8 h-8 mx-auto mb-2" />
                    <p>No pending invitations</p>
                  </div>
                ) : (
                  invitations.map((invitation) => (
                    <div
                      key={invitation._id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{invitation.email}</div>
                        <div className="text-sm text-muted-foreground">
                          {invitation.firstName} {invitation.lastName}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getRoleBadgeVariant(invitation.role)}>
                            {getRoleIcon(invitation.role)}
                            <span className="ml-1">{invitation.role}</span>
                          </Badge>
                          <Badge variant="outline">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                          Sent {formatTime(invitation.invitedAt)}
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/invite/${invitation.inviteToken}`,
                                )
                              }
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy invitation link</TooltipContent>
                        </Tooltip>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeInvitation(invitation._id)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Invite Tab */}
          <TabsContent value="invite" className="mt-4">
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name (Optional)</Label>
                  <Input
                    id="firstName"
                    value={inviteForm.firstName}
                    onChange={(e) =>
                      setInviteForm((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    placeholder="John"
                    disabled={isInviting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name (Optional)</Label>
                  <Input
                    id="lastName"
                    value={inviteForm.lastName}
                    onChange={(e) =>
                      setInviteForm((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    placeholder="Doe"
                    disabled={isInviting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="john@company.com"
                  required
                  disabled={isInviting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value: 'admin' | 'member' | 'guest') =>
                    setInviteForm((prev) => ({ ...prev, role: value }))
                  }
                  disabled={isInviting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Admin - Full access
                      </div>
                    </SelectItem>
                    <SelectItem value="member">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Member - Standard access
                      </div>
                    </SelectItem>
                    <SelectItem value="guest">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Guest - Limited access
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Can Create Workspaces</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow this person to create new workspaces
                    </p>
                  </div>
                  <Switch
                    checked={inviteForm.canCreateWorkspaces}
                    onCheckedChange={(checked) =>
                      setInviteForm((prev) => ({
                        ...prev,
                        canCreateWorkspaces: checked,
                      }))
                    }
                    disabled={isInviting}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Can Invite Members</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow this person to invite other people
                    </p>
                  </div>
                  <Switch
                    checked={inviteForm.canInviteMembers}
                    onCheckedChange={(checked) =>
                      setInviteForm((prev) => ({
                        ...prev,
                        canInviteMembers: checked,
                      }))
                    }
                    disabled={isInviting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="personalMessage">
                  Personal Message (Optional)
                </Label>
                <Textarea
                  id="personalMessage"
                  value={inviteForm.personalMessage}
                  onChange={(e) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      personalMessage: e.target.value,
                    }))
                  }
                  placeholder="Welcome to our team! Looking forward to working with you."
                  className="min-h-[80px]"
                  disabled={isInviting}
                />
              </div>

              <Button
                type="submit"
                disabled={!inviteForm.email.trim() || isInviting}
                className="w-full"
              >
                {isInviting ? (
                  <>
                    <Mail className="w-4 h-4 mr-2 animate-pulse" />
                    Sending Invitation...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
