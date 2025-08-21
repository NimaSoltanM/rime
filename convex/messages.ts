// convex/messages.ts
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import {
  getCurrentUserFromToken,
  checkWorkspaceAccess,
  isWorkspaceAdmin,
} from './utils'

// Get messages for a workspace (real-time)
export const get = query({
  args: {
    workspaceId: v.id('workspaces'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Check workspace access
    const hasAccess = await checkWorkspaceAccess(
      ctx,
      user._id,
      args.workspaceId,
    )
    if (!hasAccess) throw new Error('No access to workspace')

    // Get messages ordered by creation time
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .filter((q) => q.eq(q.field('isDeleted'), false))
      .order('asc')
      .collect()

    // Enrich messages with user data
    const messagesWithUsers = await Promise.all(
      messages.map(async (message) => {
        const messageUser = await ctx.db.get(message.userId)
        return {
          ...message,
          user: messageUser
            ? {
                _id: messageUser._id,
                firstName: messageUser.firstName,
                lastName: messageUser.lastName,
                status: messageUser.status,
              }
            : null,
        }
      }),
    )

    return messagesWithUsers
  },
})

// Send message
export const send = mutation({
  args: {
    text: v.string(),
    workspaceId: v.id('workspaces'),
    parentMessageId: v.optional(v.id('messages')),
    messageType: v.optional(
      v.union(
        v.literal('message'),
        v.literal('announcement'),
        v.literal('system'),
        v.literal('meeting_scheduled'),
        v.literal('file_shared'),
      ),
    ),
    mentions: v.optional(v.array(v.id('users'))),
    attachmentId: v.optional(v.id('files')),
    isImportant: v.optional(v.boolean()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Get workspace and verify access
    const workspace = await ctx.db.get(args.workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    const hasAccess = await checkWorkspaceAccess(
      ctx,
      user._id,
      args.workspaceId,
    )
    if (!hasAccess) throw new Error('No access to workspace')

    // If replying to thread, verify parent message exists
    if (args.parentMessageId) {
      const parentMessage = await ctx.db.get(args.parentMessageId)
      if (!parentMessage || parentMessage.workspaceId !== args.workspaceId) {
        throw new Error('Invalid parent message')
      }
    }

    // Create message
    const messageId = await ctx.db.insert('messages', {
      text: args.text.trim(),
      organizationId: workspace.organizationId,
      workspaceId: args.workspaceId,
      userId: user._id,
      parentMessageId: args.parentMessageId,
      messageType: args.messageType || 'message',
      mentions: args.mentions,
      attachmentId: args.attachmentId,
      isImportant: args.isImportant || false,
      isPinned: false,
      isEdited: false,
      threadCount: 0,
      hasAttachment: !!args.attachmentId,
      attachmentName: args.attachmentId ? 'Attachment' : undefined,
      isDeleted: false,
    })

    // Update parent message thread count
    if (args.parentMessageId) {
      const parentMessage = await ctx.db.get(args.parentMessageId)
      if (parentMessage) {
        await ctx.db.patch(args.parentMessageId, {
          threadCount: (parentMessage.threadCount || 0) + 1,
        })
      }
    }

    return messageId
  },
})

// Edit message
export const edit = mutation({
  args: {
    messageId: v.id('messages'),
    text: v.string(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const message = await ctx.db.get(args.messageId)
    if (!message) throw new Error('Message not found')

    // Only message author can edit (within 15 minutes)
    if (message.userId !== user._id) {
      throw new Error('Can only edit your own messages')
    }

    const fifteenMinutes = 15 * 60 * 1000
    if (Date.now() - message._creationTime > fifteenMinutes) {
      throw new Error('Can only edit messages within 15 minutes')
    }

    await ctx.db.patch(args.messageId, {
      text: args.text.trim(),
      isEdited: true,
      editedAt: Date.now(),
    })

    return args.messageId
  },
})

// Delete message
export const remove = mutation({
  args: {
    messageId: v.id('messages'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const message = await ctx.db.get(args.messageId)
    if (!message) throw new Error('Message not found')

    // Check if user can delete (author or workspace admin)
    let canDelete = message.userId === user._id

    if (!canDelete) {
      const membership = await ctx.db
        .query('workspaceMembers')
        .withIndex('by_workspace_user', (q) =>
          q.eq('workspaceId', message.workspaceId).eq('userId', user._id),
        )
        .first()
      canDelete = Boolean(membership && membership.role === 'admin')
    }

    if (!canDelete) throw new Error('Not authorized to delete message')

    await ctx.db.patch(args.messageId, {
      isDeleted: true,
      deletedAt: Date.now(),
      deletedBy: user._id,
    })

    return { success: true }
  },
})

// Pin message
export const pin = mutation({
  args: {
    messageId: v.id('messages'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const message = await ctx.db.get(args.messageId)
    if (!message) throw new Error('Message not found')

    // Check if user is workspace admin
    const isAdmin = await isWorkspaceAdmin(ctx, user._id, message.workspaceId)
    if (!isAdmin) {
      throw new Error('Only workspace admins can pin messages')
    }

    await ctx.db.patch(args.messageId, { isPinned: true })
    return { success: true }
  },
})

// Unpin message
export const unpin = mutation({
  args: {
    messageId: v.id('messages'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const message = await ctx.db.get(args.messageId)
    if (!message) throw new Error('Message not found')

    // Check if user is workspace admin
    const isAdmin = await isWorkspaceAdmin(ctx, user._id, message.workspaceId)
    if (!isAdmin) {
      throw new Error('Only workspace admins can unpin messages')
    }

    await ctx.db.patch(args.messageId, { isPinned: false })
    return { success: true }
  },
})

// Add reaction
export const addReaction = mutation({
  args: {
    messageId: v.id('messages'),
    emoji: v.string(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const message = await ctx.db.get(args.messageId)
    if (!message) throw new Error('Message not found')

    // Check workspace access
    const hasAccess = await checkWorkspaceAccess(
      ctx,
      user._id,
      message.workspaceId,
    )
    if (!hasAccess) throw new Error('No access to workspace')

    // Check if reaction already exists
    const existingReaction = await ctx.db
      .query('reactions')
      .withIndex('by_user_message', (q) =>
        q.eq('userId', user._id).eq('messageId', args.messageId),
      )
      .filter((q) => q.eq(q.field('emoji'), args.emoji))
      .first()

    if (existingReaction) {
      throw new Error('You already reacted with this emoji')
    }

    await ctx.db.insert('reactions', {
      messageId: args.messageId,
      userId: user._id,
      organizationId: message.organizationId,
      emoji: args.emoji,
    })

    return { success: true }
  },
})

// Remove reaction
export const removeReaction = mutation({
  args: {
    messageId: v.id('messages'),
    emoji: v.string(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const reaction = await ctx.db
      .query('reactions')
      .withIndex('by_user_message', (q) =>
        q.eq('userId', user._id).eq('messageId', args.messageId),
      )
      .filter((q) => q.eq(q.field('emoji'), args.emoji))
      .first()

    if (!reaction) {
      throw new Error('Reaction not found')
    }

    await ctx.db.delete(reaction._id)
    return { success: true }
  },
})

// Mark message as read
export const markAsRead = mutation({
  args: {
    messageId: v.id('messages'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const message = await ctx.db.get(args.messageId)
    if (!message) throw new Error('Message not found')

    // Check if already marked as read
    const existingRead = await ctx.db
      .query('messageReads')
      .withIndex('by_user_message', (q) =>
        q.eq('userId', user._id).eq('messageId', args.messageId),
      )
      .first()

    if (existingRead) return { success: true }

    await ctx.db.insert('messageReads', {
      messageId: args.messageId,
      userId: user._id,
      organizationId: message.organizationId,
      readAt: Date.now(),
    })

    return { success: true }
  },
})

// Mark all messages in workspace as read
export const markWorkspaceAsRead = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const workspace = await ctx.db.get(args.workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    const hasAccess = await checkWorkspaceAccess(
      ctx,
      user._id,
      args.workspaceId,
    )
    if (!hasAccess) throw new Error('No access to workspace')

    // Get all unread messages
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .filter((q) => q.eq(q.field('isDeleted'), false))
      .collect()

    const readMessages = await ctx.db
      .query('messageReads')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    const readMessageIds = new Set(readMessages.map((r) => r.messageId))

    for (const message of messages) {
      if (!readMessageIds.has(message._id)) {
        await ctx.db.insert('messageReads', {
          messageId: message._id,
          userId: user._id,
          organizationId: message.organizationId,
          readAt: Date.now(),
        })
      }
    }

    return { success: true }
  },
})
