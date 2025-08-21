// convex/messages.ts
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

// Get messages for a workspace (real-time)
export const get = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    // Get messages ordered by creation time
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .order('asc')
      .collect()

    // Enrich messages with user data
    const messagesWithUsers = await Promise.all(
      messages.map(async (message) => {
        const user = await ctx.db.get(message.userId)
        return {
          ...message,
          user: user
            ? {
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status,
              }
            : null,
        }
      }),
    )

    return messagesWithUsers
  },
})

// Send a new message
export const send = mutation({
  args: {
    text: v.string(),
    workspaceId: v.id('workspaces'),
    sessionToken: v.string(), // ← ADD SESSION TOKEN
  },
  handler: async (ctx, args) => {
    // Get current user using your auth system
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Verify workspace exists
    const workspace = await ctx.db.get(args.workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    // Create the message
    const messageId = await ctx.db.insert('messages', {
      text: args.text.trim(),
      workspaceId: args.workspaceId,
      userId: user._id,
    })

    return messageId
  },
})

// Get latest messages count for a workspace (for unread indicators)
export const getCount = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .collect()

    return messages.length
  },
})

// Get recent message for workspace preview
export const getLatest = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    const latestMessage = await ctx.db
      .query('messages')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .order('desc')
      .first()

    if (!latestMessage) return null

    const user = await ctx.db.get(latestMessage.userId)

    return {
      ...latestMessage,
      user: user
        ? {
            firstName: user.firstName,
            lastName: user.lastName,
          }
        : null,
    }
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
