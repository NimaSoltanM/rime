// convex/workspaces.ts
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

// Get all workspaces (for sidebar)
export const get = query({
  args: {},
  handler: async (ctx) => {
    // For MVP: get all workspaces (later add user-specific filtering)
    const workspaces = await ctx.db.query('workspaces').order('desc').collect()

    // Enrich with creator info and latest message
    const workspacesWithData = await Promise.all(
      workspaces.map(async (workspace) => {
        const creator = await ctx.db.get(workspace.createdBy)

        // Get latest message for preview
        const latestMessage = await ctx.db
          .query('messages')
          .withIndex('by_workspace', (q) => q.eq('workspaceId', workspace._id))
          .order('desc')
          .first()

        // Get message count
        const messageCount = await ctx.db
          .query('messages')
          .withIndex('by_workspace', (q) => q.eq('workspaceId', workspace._id))
          .collect()

        return {
          ...workspace,
          creator: creator
            ? {
                firstName: creator.firstName,
                lastName: creator.lastName,
              }
            : null,
          latestMessage: latestMessage
            ? {
                text: latestMessage.text,
                createdAt: latestMessage._creationTime,
              }
            : null,
          messageCount: messageCount.length,
        }
      }),
    )

    return workspacesWithData
  },
})

// Get single workspace details
export const getById = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId)

    if (!workspace) {
      throw new Error('Workspace not found')
    }

    const creator = await ctx.db.get(workspace.createdBy)

    return {
      ...workspace,
      creator: creator
        ? {
            firstName: creator.firstName,
            lastName: creator.lastName,
          }
        : null,
    }
  },
})

// Create new workspace
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    sessionToken: v.string(), // ← ADD SESSION TOKEN
  },
  handler: async (ctx, args) => {
    // Get current user using your auth system
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Check if workspace name already exists
    const existingWorkspace = await ctx.db
      .query('workspaces')
      .filter((q) => q.eq(q.field('name'), args.name.trim().toLowerCase()))
      .first()

    if (existingWorkspace) {
      throw new Error('Workspace name already exists')
    }

    // Create the workspace
    const workspaceId = await ctx.db.insert('workspaces', {
      name: args.name.trim(),
      description: args.description?.trim(),
      createdBy: user._id,
    })

    return workspaceId
  },
})

// Delete workspace (admin only)
export const remove = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    sessionToken: v.string(), // ← ADD SESSION TOKEN
  },
  handler: async (ctx, args) => {
    // Get current user using your auth system
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Get workspace
    const workspace = await ctx.db.get(args.workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    // Check if user is the creator
    if (workspace.createdBy !== user._id) {
      throw new Error('Only workspace creator can delete')
    }

    // Delete all messages in the workspace first
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .collect()

    for (const message of messages) {
      await ctx.db.delete(message._id)
    }

    // Delete the workspace
    await ctx.db.delete(args.workspaceId)
  },
})

// Helper function to get user from session token (using your auth pattern)
async function getCurrentUserFromToken(ctx: any, sessionToken: string) {
  if (!sessionToken) {
    return null
  }

  // Find session
  const session = await ctx.db
    .query('sessions')
    .withIndex('by_token', (q: any) => q.eq('token', sessionToken))
    .first()

  if (!session || Date.now() > session.expiresAt) {
    return null
  }

  // Get user
  return await ctx.db.get(session.userId)
}
