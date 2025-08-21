// convex/invitations.ts
import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { getCurrentUserFromToken, generateSecureToken } from './utils'

// Create organization invitation
export const createOrganizationInvitation = mutation({
  args: {
    organizationId: v.id('organizations'),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    role: v.union(v.literal('admin'), v.literal('member'), v.literal('guest')),
    canCreateWorkspaces: v.boolean(),
    canInviteMembers: v.boolean(),
    personalMessage: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Check if user can invite
    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id),
      )
      .first()

    if (
      !membership ||
      (!membership.canInviteMembers &&
        !['owner', 'admin'].includes(membership.role))
    ) {
      throw new Error('Not authorized to send invitations')
    }

    // Check if user is already a member
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first()

    if (existingUser) {
      const existingMembership = await ctx.db
        .query('organizationMembers')
        .withIndex('by_org_user', (q) =>
          q
            .eq('organizationId', args.organizationId)
            .eq('userId', existingUser._id),
        )
        .first()

      if (existingMembership) throw new Error('User is already a member')
    }

    // Check for pending invitation - use organization index then filter
    const existingInvitation = await ctx.db
      .query('organizationInvitations')
      .withIndex('by_organization', (q) =>
        q.eq('organizationId', args.organizationId),
      )
      .filter((q) => q.eq(q.field('email'), args.email))
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .first()

    if (existingInvitation) throw new Error('Invitation already sent')

    const inviteToken = generateSecureToken()
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days

    const invitationId = await ctx.db.insert('organizationInvitations', {
      organizationId: args.organizationId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      inviteToken,
      role: args.role,
      canCreateWorkspaces: args.canCreateWorkspaces,
      canInviteMembers: args.canInviteMembers,
      invitedBy: user._id,
      invitedAt: Date.now(),
      expiresAt,
      status: 'pending',
      personalMessage: args.personalMessage,
    })

    return { invitationId, inviteToken }
  },
})

// Accept organization invitation
export const acceptOrganizationInvitation = mutation({
  args: {
    inviteToken: v.string(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Find invitation by token
    const invitation = await ctx.db
      .query('organizationInvitations')
      .withIndex('by_token', (q) => q.eq('inviteToken', args.inviteToken))
      .first()

    if (!invitation) throw new Error('Invalid invitation token')

    if (invitation.status !== 'pending') {
      throw new Error('Invitation is no longer valid')
    }

    if (Date.now() > invitation.expiresAt) {
      await ctx.db.patch(invitation._id, { status: 'expired' })
      throw new Error('Invitation has expired')
    }

    // Check if user email matches invitation
    if (user.email !== invitation.email) {
      throw new Error('This invitation was sent to a different email address')
    }

    // Check if already a member
    const existingMembership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q
          .eq('organizationId', invitation.organizationId)
          .eq('userId', user._id),
      )
      .first()

    if (existingMembership) {
      await ctx.db.patch(invitation._id, { status: 'accepted' })
      throw new Error('You are already a member of this organization')
    }

    // Create membership
    await ctx.db.insert('organizationMembers', {
      organizationId: invitation.organizationId,
      userId: user._id,
      role: invitation.role,
      canCreateWorkspaces: invitation.canCreateWorkspaces,
      canInviteMembers: invitation.canInviteMembers,
      canManageBilling: false,
      joinedAt: Date.now(),
      invitedBy: invitation.invitedBy,
      inviteAcceptedAt: Date.now(),
      status: 'active',
    })

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, {
      status: 'accepted',
      acceptedAt: Date.now(),
      acceptedBy: user._id,
    })

    return { organizationId: invitation.organizationId }
  },
})

// Decline organization invitation
export const declineOrganizationInvitation = mutation({
  args: {
    inviteToken: v.string(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const invitation = await ctx.db
      .query('organizationInvitations')
      .withIndex('by_token', (q) => q.eq('inviteToken', args.inviteToken))
      .first()

    if (!invitation) throw new Error('Invalid invitation token')

    if (invitation.status !== 'pending') {
      throw new Error('Invitation is no longer valid')
    }

    await ctx.db.patch(invitation._id, {
      status: 'declined',
      declinedAt: Date.now(),
    })

    return { success: true }
  },
})

// Revoke organization invitation
export const revokeOrganizationInvitation = mutation({
  args: {
    invitationId: v.id('organizationInvitations'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const invitation = await ctx.db.get(args.invitationId)
    if (!invitation) throw new Error('Invitation not found')

    // Check if user can revoke
    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q
          .eq('organizationId', invitation.organizationId)
          .eq('userId', user._id),
      )
      .first()

    const canRevoke =
      invitation.invitedBy === user._id ||
      (membership && ['owner', 'admin'].includes(membership.role))

    if (!canRevoke) throw new Error('Not authorized to revoke invitation')

    await ctx.db.patch(args.invitationId, {
      status: 'revoked',
    })

    return { success: true }
  },
})

// Create workspace invitation
export const createWorkspaceInvitation = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    userId: v.id('users'),
    role: v.union(v.literal('admin'), v.literal('member'), v.literal('viewer')),
    personalMessage: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const workspace = await ctx.db.get(args.workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    // Check if current user can invite
    const membership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_user', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', user._id),
      )
      .first()

    if (!membership || membership.role !== 'admin') {
      throw new Error('Only workspace admins can send invitations')
    }

    // Check if target user is org member
    const orgMembership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q
          .eq('organizationId', workspace.organizationId)
          .eq('userId', args.userId),
      )
      .first()

    if (!orgMembership || orgMembership.status !== 'active') {
      throw new Error('User must be organization member first')
    }

    // Check if already workspace member
    const existingMembership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_user', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', args.userId),
      )
      .first()

    if (existingMembership)
      throw new Error('User is already a workspace member')

    // Check for pending invitation
    const existingInvitation = await ctx.db
      .query('workspaceInvitations')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .filter((q) => q.eq(q.field('userId'), args.userId))
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .first()

    if (existingInvitation) throw new Error('Invitation already sent')

    const invitationId = await ctx.db.insert('workspaceInvitations', {
      workspaceId: args.workspaceId,
      organizationId: workspace.organizationId,
      userId: args.userId,
      role: args.role,
      invitedBy: user._id,
      invitedAt: Date.now(),
      status: 'pending',
      personalMessage: args.personalMessage,
    })

    return invitationId
  },
})

// Accept workspace invitation
export const acceptWorkspaceInvitation = mutation({
  args: {
    invitationId: v.id('workspaceInvitations'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const invitation = await ctx.db.get(args.invitationId)
    if (!invitation) throw new Error('Invitation not found')

    if (invitation.userId !== user._id) {
      throw new Error('This invitation is not for you')
    }

    if (invitation.status !== 'pending') {
      throw new Error('Invitation is no longer valid')
    }

    // Check if already a member
    const existingMembership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_user', (q) =>
        q.eq('workspaceId', invitation.workspaceId).eq('userId', user._id),
      )
      .first()

    if (existingMembership) {
      await ctx.db.patch(invitation._id, { status: 'accepted' })
      throw new Error('You are already a member of this workspace')
    }

    // Create membership
    await ctx.db.insert('workspaceMembers', {
      workspaceId: invitation.workspaceId,
      userId: user._id,
      organizationId: invitation.organizationId,
      role: invitation.role,
      joinedAt: Date.now(),
      addedBy: invitation.invitedBy,
      notificationsEnabled: true,
      mentionNotifications: true,
    })

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, {
      status: 'accepted',
      acceptedAt: Date.now(),
    })

    return { workspaceId: invitation.workspaceId }
  },
})

// Decline workspace invitation
export const declineWorkspaceInvitation = mutation({
  args: {
    invitationId: v.id('workspaceInvitations'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const invitation = await ctx.db.get(args.invitationId)
    if (!invitation) throw new Error('Invitation not found')

    if (invitation.userId !== user._id) {
      throw new Error('This invitation is not for you')
    }

    if (invitation.status !== 'pending') {
      throw new Error('Invitation is no longer valid')
    }

    await ctx.db.patch(invitation._id, {
      status: 'declined',
      declinedAt: Date.now(),
    })

    return { success: true }
  },
})

// Revoke workspace invitation
export const revokeWorkspaceInvitation = mutation({
  args: {
    invitationId: v.id('workspaceInvitations'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const invitation = await ctx.db.get(args.invitationId)
    if (!invitation) throw new Error('Invitation not found')

    // Check if user can revoke
    const membership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_user', (q) =>
        q.eq('workspaceId', invitation.workspaceId).eq('userId', user._id),
      )
      .first()

    const canRevoke =
      invitation.invitedBy === user._id ||
      (membership && membership.role === 'admin')

    if (!canRevoke) throw new Error('Not authorized to revoke invitation')

    // Delete the invitation (workspace invitations don't have 'revoked' status)
    await ctx.db.delete(invitation._id)
    return { success: true }
  },
})
