// convex/workspaces.ts
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import {
  checkOrganizationAccess,
  checkWorkspaceAccess,
  getCurrentUserFromToken,
} from './utils'

// Create workspace
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    organizationId: v.id('organizations'),
    type: v.union(
      v.literal('public'),
      v.literal('private'),
      v.literal('archived'),
    ),
    purpose: v.optional(
      v.union(
        v.literal('general'),
        v.literal('project'),
        v.literal('department'),
        v.literal('client'),
        v.literal('announcement'),
      ),
    ),
    projectDeadline: v.optional(v.number()),
    clientName: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal('high'), v.literal('medium'), v.literal('low')),
    ),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Check organization access and permissions
    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id),
      )
      .first()

    if (!membership || membership.status !== 'active') {
      throw new Error('No access to organization')
    }

    if (
      !membership.canCreateWorkspaces &&
      !['owner', 'admin'].includes(membership.role)
    ) {
      throw new Error('Not authorized to create workspaces')
    }

    // Create workspace
    const workspaceId = await ctx.db.insert('workspaces', {
      name: args.name,
      description: args.description,
      organizationId: args.organizationId,
      type: args.type,
      purpose: args.purpose,
      projectDeadline: args.projectDeadline,
      clientName: args.clientName,
      priority: args.priority,
      createdBy: user._id,
      isArchived: false,
      allowThreads: true,
      allowFileUploads: true,
    })

    // Add creator as admin
    await ctx.db.insert('workspaceMembers', {
      workspaceId,
      userId: user._id,
      organizationId: args.organizationId,
      role: 'admin',
      joinedAt: Date.now(),
      addedBy: user._id,
      notificationsEnabled: true,
      mentionNotifications: true,
    })

    return workspaceId
  },
})

// Update workspace
export const update = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(
      v.union(v.literal('public'), v.literal('private'), v.literal('archived')),
    ),
    purpose: v.optional(
      v.union(
        v.literal('general'),
        v.literal('project'),
        v.literal('department'),
        v.literal('client'),
        v.literal('announcement'),
      ),
    ),
    projectDeadline: v.optional(v.number()),
    clientName: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal('high'), v.literal('medium'), v.literal('low')),
    ),
    allowThreads: v.optional(v.boolean()),
    allowFileUploads: v.optional(v.boolean()),
    retentionDays: v.optional(v.number()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const workspace = await ctx.db.get(args.workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    // Check if user can edit workspace
    const membership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_user', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', user._id),
      )
      .first()

    if (!membership || membership.role !== 'admin') {
      throw new Error('Not authorized to edit workspace')
    }

    const updates: any = {}
    if (args.name !== undefined) updates.name = args.name
    if (args.description !== undefined) updates.description = args.description
    if (args.type !== undefined) updates.type = args.type
    if (args.purpose !== undefined) updates.purpose = args.purpose
    if (args.projectDeadline !== undefined)
      updates.projectDeadline = args.projectDeadline
    if (args.clientName !== undefined) updates.clientName = args.clientName
    if (args.priority !== undefined) updates.priority = args.priority
    if (args.allowThreads !== undefined)
      updates.allowThreads = args.allowThreads
    if (args.allowFileUploads !== undefined)
      updates.allowFileUploads = args.allowFileUploads
    if (args.retentionDays !== undefined)
      updates.retentionDays = args.retentionDays

    await ctx.db.patch(args.workspaceId, updates)
    return args.workspaceId
  },
})

// Archive workspace
export const archive = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const workspace = await ctx.db.get(args.workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    // Check permissions
    const membership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_user', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', user._id),
      )
      .first()

    if (!membership || membership.role !== 'admin') {
      throw new Error('Not authorized')
    }

    await ctx.db.patch(args.workspaceId, {
      isArchived: true,
      type: 'archived',
    })

    return { success: true }
  },
})

// Unarchive workspace
export const unarchive = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const workspace = await ctx.db.get(args.workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    // Check permissions
    const membership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_user', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', user._id),
      )
      .first()

    if (!membership || membership.role !== 'admin') {
      throw new Error('Not authorized')
    }

    await ctx.db.patch(args.workspaceId, {
      isArchived: false,
      type: 'public',
    })

    return { success: true }
  },
})

// Delete workspace
export const remove = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const workspace = await ctx.db.get(args.workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    // Check if user is workspace admin or org owner/admin
    const workspaceMembership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_user', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', user._id),
      )
      .first()

    const orgMembership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', workspace.organizationId).eq('userId', user._id),
      )
      .first()

    const canDelete =
      (workspaceMembership && workspaceMembership.role === 'admin') ||
      (orgMembership && ['owner', 'admin'].includes(orgMembership.role))

    if (!canDelete) {
      throw new Error('Not authorized to delete workspace')
    }

    // Soft delete all messages
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .collect()

    for (const message of messages) {
      await ctx.db.patch(message._id, {
        isDeleted: true,
        deletedAt: Date.now(),
        deletedBy: user._id,
      })
    }

    // Remove all workspace members
    const members = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .collect()

    for (const member of members) {
      await ctx.db.delete(member._id)
    }

    // Delete workspace
    await ctx.db.delete(args.workspaceId)
    return { success: true }
  },
})

export const getUserWorkspaces = query({
  args: {
    organizationId: v.id('organizations'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Verify org access
    const hasOrgAccess = await checkOrganizationAccess(
      ctx,
      user._id,
      args.organizationId,
    )
    if (!hasOrgAccess) throw new Error('No access to organization')

    // Get user's workspace memberships in this org
    const memberships = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id),
      )
      .collect()

    // Get workspace details with message info
    const workspacesWithDetails = []

    for (const membership of memberships) {
      const workspace = await ctx.db.get(membership.workspaceId)
      if (!workspace || workspace.isArchived) continue

      // Get message count
      const messages = await ctx.db
        .query('messages')
        .withIndex('by_workspace', (q) => q.eq('workspaceId', workspace._id))
        .filter((q) => q.eq(q.field('isDeleted'), false))
        .collect()

      // Get latest message
      const latestMessage = await ctx.db
        .query('messages')
        .withIndex('by_workspace', (q) => q.eq('workspaceId', workspace._id))
        .filter((q) => q.eq(q.field('isDeleted'), false))
        .order('desc')
        .first()

      let latestMessageData = null
      if (latestMessage) {
        const messageUser = await ctx.db.get(latestMessage.userId)
        latestMessageData = {
          text: latestMessage.text,
          createdAt: latestMessage._creationTime,
          user: messageUser
            ? {
                firstName: messageUser.firstName,
                lastName: messageUser.lastName,
              }
            : null,
        }
      }

      workspacesWithDetails.push({
        _id: workspace._id,
        name: workspace.name,
        description: workspace.description,
        type: workspace.type,
        purpose: workspace.purpose || 'general',
        messageCount: messages.length,
        latestMessage: latestMessageData,
        userRole: membership.role,
      })
    }

    return workspacesWithDetails
  },
})

// Get workspace details
export const getWorkspace = query({
  args: {
    workspaceId: v.id('workspaces'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const workspace = await ctx.db.get(args.workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    // Check organization access first
    const hasOrgAccess = await checkOrganizationAccess(
      ctx,
      user._id,
      workspace.organizationId,
    )
    if (!hasOrgAccess) throw new Error('No access to organization')

    // Check workspace access
    const hasWorkspaceAccess = await checkWorkspaceAccess(
      ctx,
      user._id,
      args.workspaceId,
    )
    if (!hasWorkspaceAccess) throw new Error('No access to workspace')

    // Get member count
    const members = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .collect()

    // Get message count
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .filter((q) => q.eq(q.field('isDeleted'), false))
      .collect()

    return {
      ...workspace,
      memberCount: members.length,
      messageCount: messages.length,
    }
  },
})
