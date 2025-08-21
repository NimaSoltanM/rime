// convex/schemas/messages.ts
import { defineTable } from 'convex/server'
import { v } from 'convex/values'

// Messages - Now with proper multi-tenant isolation
export const messagesTable = defineTable({
  text: v.string(),

  // Multi-tenant isolation - CRITICAL!
  organizationId: v.id('organizations'),
  workspaceId: v.id('workspaces'),
  userId: v.id('users'),

  // Message metadata
  isImportant: v.optional(v.boolean()),
  isPinned: v.optional(v.boolean()),
  isEdited: v.optional(v.boolean()),
  editedAt: v.optional(v.number()),

  // Threading support
  parentMessageId: v.optional(v.id('messages')), // null = main message
  threadCount: v.optional(v.number()), // Number of replies

  // File attachments
  hasAttachment: v.optional(v.boolean()),
  attachmentId: v.optional(v.id('files')),
  attachmentName: v.optional(v.string()),
  attachmentType: v.optional(v.string()),

  // Business context
  messageType: v.optional(
    v.union(
      v.literal('message'),
      v.literal('announcement'),
      v.literal('system'), // "User joined workspace"
      v.literal('meeting_scheduled'),
      v.literal('file_shared'),
    ),
  ),

  // Mentions and notifications
  mentions: v.optional(v.array(v.id('users'))), // @username mentions

  // Message status
  isDeleted: v.optional(v.boolean()),
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id('users')),
})
  .index('by_organization', ['organizationId'])
  .index('by_workspace', ['workspaceId'])
  .index('by_user', ['userId'])
  .index('by_org_workspace', ['organizationId', 'workspaceId'])
  .index('by_parent', ['parentMessageId'])
  .index('by_important', ['isImportant'])
  .index('by_deleted', ['isDeleted'])

// Message reactions (emojis, thumbs up, etc.)
export const reactionsTable = defineTable({
  messageId: v.id('messages'),
  userId: v.id('users'),
  organizationId: v.id('organizations'), // For isolation
  emoji: v.string(), // "👍", "❤️", "🎉"
})
  .index('by_message', ['messageId'])
  .index('by_user', ['userId'])
  .index('by_organization', ['organizationId'])
  .index('by_user_message', ['userId', 'messageId'])

// Read receipts - who has seen what messages
export const messageReadsTable = defineTable({
  messageId: v.id('messages'),
  userId: v.id('users'),
  organizationId: v.id('organizations'), // For isolation
  readAt: v.number(),
})
  .index('by_message', ['messageId'])
  .index('by_user', ['userId'])
  .index('by_organization', ['organizationId'])
  .index('by_user_message', ['userId', 'messageId'])
