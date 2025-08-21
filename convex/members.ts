// convex/members.ts
import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { getCurrentUserFromToken } from './utils'

// Add user to organization
export const addToOrganization = mutation({
  args: {
    organizationId: v.id('organizations'),
    userEmail: v.string(),
    role: v.union(v.literal('admin'), v.literal('member'), v.literal('guest')),
    canCreateWorkspaces: v.boolean(),
    canInviteMembers: v.boolean(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Check if current user can invite
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
      throw new Error('Not authorized to invite members')
    }

    // Find user by email
    const targetUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.userEmail))
      .first()

    if (!targetUser) throw new Error('User not found')

    // Check if already a member
    const existingMembership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q
          .eq('organizationId', args.organizationId)
          .eq('userId', targetUser._id),
      )
      .first()

    if (existingMembership) throw new Error('User is already a member')

    await ctx.db.insert('organizationMembers', {
      organizationId: args.organizationId,
      userId: targetUser._id,
      role: args.role,
      canCreateWorkspaces: args.canCreateWorkspaces,
      canInviteMembers: args.canInviteMembers,
      canManageBilling: false,
      joinedAt: Date.now(),
      invitedBy: user._id,
      inviteAcceptedAt: Date.now(),
      status: 'active',
    })

    return { success: true }
  },
})

// Update organization member role
export const updateOrganizationMemberRole = mutation({
  args: {
    organizationId: v.id('organizations'),
    memberId: v.id('users'),
    role: v.union(
      v.literal('owner'),
      v.literal('admin'),
      v.literal('member'),
      v.literal('guest'),
    ),
    canCreateWorkspaces: v.optional(v.boolean()),
    canInviteMembers: v.optional(v.boolean()),
    canManageBilling: v.optional(v.boolean()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Check if current user is owner/admin
    const currentMembership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id),
      )
      .first()

    if (
      !currentMembership ||
      !['owner', 'admin'].includes(currentMembership.role)
    ) {
      throw new Error('Not authorized')
    }

    // Get target membership
    const targetMembership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', args.memberId),
      )
      .first()

    if (!targetMembership) throw new Error('Member not found')

    // Only owners can change ownership
    if (args.role === 'owner' && currentMembership.role !== 'owner') {
      throw new Error('Only owners can grant ownership')
    }

    const updates: any = { role: args.role }
    if (args.canCreateWorkspaces !== undefined)
      updates.canCreateWorkspaces = args.canCreateWorkspaces
    if (args.canInviteMembers !== undefined)
      updates.canInviteMembers = args.canInviteMembers
    if (args.canManageBilling !== undefined)
      updates.canManageBilling = args.canManageBilling

    await ctx.db.patch(targetMembership._id, updates)
    return { success: true }
  },
})

// Remove from organization
export const removeFromOrganization = mutation({
  args: {
    organizationId: v.id('organizations'),
    memberId: v.id('users'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Check permissions
    const currentMembership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id),
      )
      .first()

    const targetMembership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', args.memberId),
      )
      .first()

    if (!targetMembership) throw new Error('Member not found')

    // Users can remove themselves or admins can remove others
    const canRemove =
      args.memberId === user._id ||
      (currentMembership && ['owner', 'admin'].includes(currentMembership.role))

    if (!canRemove) throw new Error('Not authorized')

    // Can't remove the last owner
    if (targetMembership.role === 'owner') {
      const ownerCount = await ctx.db
        .query('organizationMembers')
        .withIndex('by_organization', (q) =>
          q.eq('organizationId', args.organizationId),
        )
        .filter((q) => q.eq(q.field('role'), 'owner'))
        .collect()

      if (ownerCount.length <= 1) {
        throw new Error('Cannot remove the last owner')
      }
    }

    // Remove from all workspaces in the organization
    const workspaceMemberships = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', args.memberId),
      )
      .collect()

    for (const workspaceMembership of workspaceMemberships) {
      await ctx.db.delete(workspaceMembership._id)
    }

    // Remove organization membership
    await ctx.db.delete(targetMembership._id)
    return { success: true }
  },
})

// Add to workspace
export const addToWorkspace = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    userId: v.id('users'),
    role: v.union(v.literal('admin'), v.literal('member'), v.literal('viewer')),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const workspace = await ctx.db.get(args.workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    // Check if current user can add members
    const membership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_user', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', user._id),
      )
      .first()

    if (!membership || membership.role !== 'admin') {
      throw new Error('Only workspace admins can add members')
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

    await ctx.db.insert('workspaceMembers', {
      workspaceId: args.workspaceId,
      userId: args.userId,
      organizationId: workspace.organizationId,
      role: args.role,
      joinedAt: Date.now(),
      addedBy: user._id,
      notificationsEnabled: true,
      mentionNotifications: true,
    })

    return { success: true }
  },
})

// Update workspace member role
export const updateWorkspaceMemberRole = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    memberId: v.id('users'),
    role: v.union(v.literal('admin'), v.literal('member'), v.literal('viewer')),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Check if current user is workspace admin
    const currentMembership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_user', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', user._id),
      )
      .first()

    if (!currentMembership || currentMembership.role !== 'admin') {
      throw new Error('Only workspace admins can update roles')
    }

    // Get target membership
    const targetMembership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_user', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', args.memberId),
      )
      .first()

    if (!targetMembership) throw new Error('Member not found')

    await ctx.db.patch(targetMembership._id, { role: args.role })
    return { success: true }
  },
})

// Remove from workspace
export const removeFromWorkspace = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    memberId: v.id('users'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const membership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_user', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', args.memberId),
      )
      .first()

    if (!membership) throw new Error('Member not found')

    // Check permissions
    const currentMembership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_user', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', user._id),
      )
      .first()

    // Users can remove themselves or admins can remove others
    const canRemove =
      args.memberId === user._id ||
      (currentMembership && currentMembership.role === 'admin')

    if (!canRemove) throw new Error('Not authorized')

    // Ensure at least one admin remains
    if (membership.role === 'admin') {
      const adminCount = await ctx.db
        .query('workspaceMembers')
        .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
        .filter((q) => q.eq(q.field('role'), 'admin'))
        .collect()

      if (adminCount.length <= 1) {
        throw new Error('Cannot remove the last workspace admin')
      }
    }

    await ctx.db.delete(membership._id)
    return { success: true }
  },
})

// Update workspace notification settings
export const updateWorkspaceNotifications = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    notificationsEnabled: v.boolean(),
    mentionNotifications: v.boolean(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const membership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_user', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', user._id),
      )
      .first()

    if (!membership) throw new Error('Not a workspace member')

    await ctx.db.patch(membership._id, {
      notificationsEnabled: args.notificationsEnabled,
      mentionNotifications: args.mentionNotifications,
    })

    return { success: true }
  },
})
